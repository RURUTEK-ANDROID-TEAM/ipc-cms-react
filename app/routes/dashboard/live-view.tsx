import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOutletContext } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Maximize } from "lucide-react";
import { LayoutDropdown } from "@/components/live-view/layout-dropdown";

type OutletHeaderSetter = {
  setHeader?: (ctx: { title?: string; actions?: ReactNode | null }) => void;
};
type PeerConnections = {
  [uid: string]: RTCPeerConnection;
};

const SIGNALING_URL = "ws://172.16.0.103:9595";
const DASHBOARD_WS_URL = "ws://172.16.0.157:5001/camdata";
const STUN_TURN_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:172.16.0.147:3478" },
    {
      urls: "turn:172.16.0.147:3478?transport=udp",
      username: "rurutek",
      credential: "ruru@123",
    },
    {
      urls: "turn:172.16.0.147:5349?transport=tcp",
      username: "rurutek",
      credential: "ruru@123",
    },
  ],
};

const LiveView = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();
  const [viewLayout, setViewLayout] = useState<"2x2" | "3x3" | "4x4">("2x2");
  const layoutToCols: { [key in "2x2" | "3x3" | "4x4"]: string } = {
    "2x2": "grid-cols-2",
    "3x3": "grid-cols-3",
    "4x4": "grid-cols-4",
  };

  const [cameraUIDs, setCameraUIDs] = useState<string[]>([]);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peerConnections = useRef<PeerConnections>({});
  const signalingWS = useRef<WebSocket | null>(null);
  const messageQueue = useRef<any[]>([]);
  const pendingCandidates = useRef<{ [uid: string]: RTCIceCandidateInit[] }>(
    {}
  );
  const lastCameraUIDs = useRef<string[]>([]); // Track last processed UIDs

  // Debounce function to limit state updates
  const debounce = <F extends (...args: any[]) => void>(
    func: F,
    wait: number
  ) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<F>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const flushQueue = () => {
    if (signalingWS.current?.readyState === WebSocket.OPEN) {
      messageQueue.current.forEach((msg) =>
        signalingWS.current!.send(JSON.stringify(msg))
      );
      messageQueue.current = [];
    }
  };

  const sendSignal = (signal: any) => {
    if (signalingWS.current?.readyState === WebSocket.OPEN) {
      try {
        signalingWS.current.send(JSON.stringify(signal));
      } catch (error) {
        console.error("Error stringifying signal:", error, signal);
      }
    } else {
      console.warn("WS not open, queue signal", signal);
      messageQueue.current.push(signal);
    }
  };

  const connectSignalingWS = useCallback(() => {
    const ws = new WebSocket(SIGNALING_URL);
    ws.binaryType = "arraybuffer";
    signalingWS.current = ws;

    ws.onopen = () => {
      console.log("✅ Signaling WebSocket connected");
      flushQueue();
    };

    ws.onmessage = async (msg) => {
      let data;
      try {
        if (msg.data instanceof ArrayBuffer) {
          data = JSON.parse(new TextDecoder("utf-8").decode(msg.data));
        } else if (msg.data instanceof Blob) {
          data = JSON.parse(await msg.data.text());
        } else if (typeof msg.data === "string") {
          data = JSON.parse(msg.data);
        } else {
          console.error("Unsupported WebSocket message type:", typeof msg.data);
          return;
        }
        handleWebSocketMessage(data);
      } catch (err) {
        console.error("❌ Error processing WebSocket message:", err, msg.data);
      }
    };

    ws.onclose = () => {
      console.log("⚠️ Signaling WebSocket closed, reconnecting...");
      setTimeout(connectSignalingWS, 5000);
    };

    ws.onerror = (err) => console.error("❌ Signaling WebSocket error:", err);
  }, []);

  const initializePeerConnection = useCallback((uid: string) => {
    console.log("🔗 Initializing PeerConnection for", uid);
    const pc = new RTCPeerConnection(STUN_TURN_CONFIG);
    peerConnections.current[uid] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 Sending ICE candidate for", uid);
        sendSignal({
          type: "webrtc/candidate",
          value: event.candidate,
          uid: "cus-" + uid,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("🎥 Received track for", uid);
      let video = videoRefs.current.get(uid);
      if (!video) {
        video = document.createElement("video");
        video.id = uid;
        video.controls = false;
        video.autoplay = true;
        video.muted = true;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "fill";
        videoRefs.current.set(uid, video);
        const streamContainer = document.getElementById(
          `streamContainer-${uid}`
        );
        if (streamContainer) {
          streamContainer.innerHTML = "";
          streamContainer.appendChild(video);
        }
      }
      if (event.streams[0]) {
        video.srcObject = event.streams[0];
        video.play().catch((e) => console.error("play() failed:", e));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE", uid, "->", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.warn("ICE failed, restarting for", uid);
        pc.restartIce();
      }
    };

    createOffer(uid);
  }, []);

  const createOffer = useCallback(async (uid: string) => {
    const pc = peerConnections.current[uid];
    if (!pc) return;
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      console.log("📤 Sending offer for", uid);
      sendSignal({
        type: "webrtc/offer",
        value: offer.sdp,
        uid: "cus-" + uid,
      });
    } catch (error) {
      console.error("Error creating offer for", uid, error);
    }
  }, []);

  const handleWebSocketMessage = useCallback(async (data: any) => {
    const uid = data.uid?.replace("cus-", "").replace("ser-", "");
    if (!uid) return;
    const pc = peerConnections.current[uid];
    if (!pc) return;

    switch (data.type) {
      case "webrtc/candidate":
        try {
          console.log("📥 Adding ICE candidate for", uid);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.value));
          } else {
            if (!pendingCandidates.current[uid]) {
              pendingCandidates.current[uid] = [];
            }
            pendingCandidates.current[uid].push(data.value);
          }
        } catch (error) {
          console.warn("Error adding ICE candidate for", uid, error);
        }
        break;
      case "webrtc/answer":
        try {
          if (pc.signalingState !== "stable") {
            console.log("📥 Setting remote description for", uid);
            await pc.setRemoteDescription({
              type: "answer",
              sdp: data.value,
            });
            if (pendingCandidates.current[uid]) {
              for (const cand of pendingCandidates.current[uid]) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              delete pendingCandidates.current[uid];
            }
          } else {
            console.warn("Ignoring answer in stable state for", uid);
          }
        } catch (error) {
          console.warn("Error setting remote description for", uid, error);
        }
        break;
      case "error":
        console.error("Server error for", uid, data);
        break;
    }
  }, []);

  const changeStream = useCallback((streamType: string, uid: string) => {
    console.log(`Changing stream to: ${streamType} for`, uid);
    sendSignal({ type: "changeStream", value: streamType, uid: "cus-" + uid });
  }, []);

  const addStream = useCallback(
    (uid: string, streamType: string) => {
      if (
        !signalingWS.current ||
        signalingWS.current.readyState !== WebSocket.OPEN
      ) {
        console.warn("WebSocket not open, initializing...");
        connectSignalingWS();
        setTimeout(() => {
          if (!peerConnections.current[uid]) {
            initializePeerConnection(uid);
            setTimeout(() => changeStream(streamType, uid), 500);
          } else {
            changeStream(streamType, uid);
          }
        }, 500);
      } else {
        if (!peerConnections.current[uid]) {
          initializePeerConnection(uid);
          setTimeout(() => changeStream(streamType, uid), 500);
        } else {
          changeStream(streamType, uid);
        }
      }
    },
    [changeStream, connectSignalingWS, initializePeerConnection]
  );

  useEffect(() => {
    outlet?.setHeader?.({
      title: "Live View",
      actions: (
        <LayoutDropdown viewLayout={viewLayout} setViewLayout={setViewLayout} />
      ),
    });
    return () => outlet?.setHeader?.({ title: "Dashboard", actions: null });
  }, [viewLayout]);

  useEffect(() => {
    const camDataWS = new WebSocket(DASHBOARD_WS_URL);

    camDataWS.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "camera_status") {
          const newUIDs: string[] = msg.online || [];
          setCameraUIDs(newUIDs);

          Object.keys(peerConnections.current).forEach((uid) => {
            if (!newUIDs.includes(uid)) {
              peerConnections.current[uid]?.close();
              delete peerConnections.current[uid];
              videoRefs.current.delete(uid);
            }
          });
        }
      } catch (err) {
        console.error("Error processing camera status:", err);
      }
    };

    connectSignalingWS();

    return () => {
      camDataWS.close();
      signalingWS.current?.close();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, []);

  useEffect(() => {
    cameraUIDs.forEach((uid) => {
      if (!peerConnections.current[uid]) {
        addStream(uid, "main");
      }
    });
  }, [cameraUIDs]);

  return (
    <div className="flex flex-col gap-4 py-0 md:gap-4 md:py-0">
      <Card className="shadow-none border-0">
        <CardContent className="space-y-0.5">
          <div className={`grid gap-4 ${layoutToCols[viewLayout]}`}>
            {cameraUIDs.map((uid) => (
              <div
                key={uid}
                className="group relative aspect-video bg-black flex items-center justify-center rounded-md overflow-hidden"
              >
                <div id={`streamContainer-${uid}`} className="w-full h-full" />
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Video className="absolute top-2 left-2 text-white w-6 h-6 cursor-pointer" />
                  <Maximize
                    className="absolute bottom-2 right-2 text-white w-6 h-6 cursor-pointer"
                    onClick={() => {
                      const container = document.getElementById(
                        `streamContainer-${uid}`
                      );
                      if (container) {
                        if (container.requestFullscreen) {
                          container.requestFullscreen();
                        } else if ((container as any).webkitRequestFullscreen) {
                          (container as any).webkitRequestFullscreen();
                        } else if ((container as any).msRequestFullscreen) {
                          (container as any).msRequestFullscreen();
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveView;
