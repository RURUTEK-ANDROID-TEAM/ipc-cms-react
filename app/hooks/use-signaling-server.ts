import { useCallback, useEffect, useRef, useState } from "react";

export const useSignalingServer = (signalingUrl: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const queueRef = useRef<any[]>([]);
  const mounted = useRef(true);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxReconnect = 5;
  const baseDelay = 3000;

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const batch = [...queueRef.current];
    queueRef.current = [];
    for (const msg of batch) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error("Failed to send queued message", err);
        queueRef.current.push(msg);
      }
    }
  }, []);

  const send = useCallback((msg: any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error("WS send failed, queued", err);
        queueRef.current.push(msg);
      }
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  const connect = useCallback(() => {
    if (!mounted.current) return;

    // clear existing timer
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    // Already open/connecting
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    )
      return;

    // Clean old
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setState("connecting");
    const ws = new WebSocket(signalingUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    const openTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.warn("WS open timeout");
        try {
          ws.close(4000, "timeout");
        } catch {}
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(openTimeout);
      if (!mounted.current) return;
      setState("connected");
      reconnectAttempts.current = 0;
      flushQueue();
    };

    ws.onmessage = async (evt) => {
      if (!mounted.current) return;
      let text: string;
      if (evt.data instanceof ArrayBuffer)
        text = new TextDecoder().decode(evt.data);
      else if (evt.data instanceof Blob) text = await (evt.data as Blob).text();
      else text = String(evt.data);

      try {
        const json = JSON.parse(text);
        // Bubble the event through a custom event so consumers can listen.
        window.dispatchEvent(
          new CustomEvent("signaling:message", { detail: json })
        );
      } catch (e) {
        console.error("Bad WS message", e, text);
      }
    };

    ws.onclose = (e) => {
      clearTimeout(openTimeout);
      if (!mounted.current) return;
      setState("disconnected");

      if (e.code === 1000) return; // normal

      if (reconnectAttempts.current >= maxReconnect) {
        console.error("Max reconnect attempts reached");
        return;
      }
      const delay = baseDelay * Math.pow(2, reconnectAttempts.current++);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = (err) => {
      console.error("WS error", err);
    };
  }, [flushQueue, signalingUrl]);

  useEffect(() => {
    mounted.current = true;
    connect();
    return () => {
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "unmount");
        } catch {}
      }
      wsRef.current = null;
    };
  }, [connect]);

  return { state, send, reconnect: connect } as const;
};
