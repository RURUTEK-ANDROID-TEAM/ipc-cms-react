import { useCallback, useEffect, useRef, useState } from "react";

type PeerMap = { [uid: string]: RTCPeerConnection };

export const useWebRTCClient = (
  ice: RTCConfiguration,
  send: (msg: any) => void
) => {
  const peers = useRef<PeerMap>({});
  const videos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [active, setActive] = useState<Set<string>>(new Set());
  const pendingCandidates = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const [pendingStreams, setPendingStreams] = useState<
    Map<string, { kind: string; retries: number }>
  >(new Map());
  const maxRetries = 3;

  const ensureVideoEl = (uid: string) => {
    const container = document.getElementById(`streamContainer-${uid}`);
    if (!container) return null;

    let video = container.querySelector(
      "video.video-stream"
    ) as HTMLVideoElement;
    if (!video) {
      video = document.createElement("video");
      video.className = "video-stream";
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      container.appendChild(video);
      videos.current.set(uid, video);
    } else {
      videos.current.set(uid, video);
    }
    return video;
  };

  const initPeer = useCallback(
    (uid: string) => {
      if (peers.current[uid]) {
        try {
          peers.current[uid].close();
        } catch {}
        delete peers.current[uid];
      }

      const pc = new RTCPeerConnection(ice);
      peers.current[uid] = pc;
      pendingCandidates.current[uid] = [];

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          send({
            type: "webrtc/candidate",
            value: ev.candidate,
            uid: `cus-${uid}`,
          });
        }
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0];
        if (!stream) return;
        const video = ensureVideoEl(uid);
        if (!video) return;
        if (video.srcObject !== stream) {
          video.srcObject = stream;
          void video.play().catch((e) => console.warn("play() failed", e));
        }
        setActive((prev) => new Set([...prev, uid]));
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setActive((prev) => {
            const s = new Set(prev);
            s.delete(uid);
            return s;
          });
        }
      };

      return pc;
    },
    [ice, send]
  );

  const createOffer = useCallback(
    async (uid: string) => {
      const pc = peers.current[uid];
      if (!pc) return;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      send({ type: "webrtc/offer", value: offer.sdp, uid: `cus-${uid}` });
    },
    [send]
  );

  const addStream = useCallback(
    (uid: string, kind: string = "main") => {
      setPendingStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(uid, { kind, retries: 0 });
        return newMap;
      });
      send({ type: "changeStream", value: kind, uid: `cus-${uid}` });
    },
    [send]
  );

  const removeStream = useCallback((uid: string) => {
    const pc = peers.current[uid];
    if (pc) {
      try {
        pc.close();
      } catch {}
      delete peers.current[uid];
    }
    const video = videos.current.get(uid);
    if (video) {
      video.srcObject = null;
      if (video.parentElement) {
        video.parentElement.removeChild(video);
      }
      videos.current.delete(uid);
    }
    setActive((prev) => {
      const s = new Set(prev);
      s.delete(uid);
      return s;
    });
    setPendingStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uid);
      return newMap;
    });
    delete pendingCandidates.current[uid];
  }, []);

  useEffect(() => {
    const onMsg = async (e: any) => {
      const data = e.detail;
      const uid: string | undefined = data?.uid
        ?.replace("cus-", "")
        .replace("ser-", "");
      if (!uid) return;

      switch (data.type) {
        case "newProducer": {
          const pc = initPeer(uid);
          setPendingStreams((prev) => {
            const kind = prev.get(uid)?.kind || "main";
            setTimeout(() => createOffer(uid), 150);
            return prev;
          });
          break;
        }
        case "producerClosed": {
          removeStream(uid);
          break;
        }
        case "webrtc/answer": {
          const pc = peers.current[uid];
          if (!pc) return;
          try {
            await pc.setRemoteDescription({ type: "answer", sdp: data.value });
            const pend = pendingCandidates.current[uid] || [];
            for (const c of pend) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (err) {
                console.warn("Failed to add pending ICE", err, c);
              }
            }
            pendingCandidates.current[uid] = [];
          } catch (err) {
            console.error("setRemoteDescription failed", err);
          }
          break;
        }
        case "webrtc/candidate": {
          const pc = peers.current[uid];
          if (!pc) return;
          try {
            let cand: any = data.value;
            if (typeof cand === "string") {
              try {
                cand = JSON.parse(cand);
              } catch {
                cand = { candidate: cand, sdpMLineIndex: 0, sdpMid: null };
              }
            }
            const norm: RTCIceCandidateInit = {
              candidate:
                cand.candidate ||
                cand.candidateLine ||
                (typeof cand === "string" ? cand : ""),
              sdpMLineIndex: cand.sdpMLineIndex ?? 0,
              sdpMid: cand.sdpMid ?? null,
            };
            if (!norm.candidate) {
              console.warn("Invalid ICE candidate received", data.value);
              return;
            }
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(norm));
            } else {
              (pendingCandidates.current[uid] ||= []).push(norm);
            }
          } catch (err) {
            console.warn("ICE candidate error", err, data.value);
          }
          break;
        }
        case "error": {
          if (
            data.message.includes("No producer found for uid") ||
            data.message.includes("Unknown message type")
          ) {
            setPendingStreams((prev) => {
              const stream = prev.get(uid);
              if (!stream || stream.retries >= maxRetries) {
                console.warn(`Max retries reached for stream ${uid}`);
                prev.delete(uid);
                return new Map(prev);
              }
              setTimeout(() => {
                send({
                  type: "changeStream",
                  value: stream.kind,
                  uid: `cus-${uid}`,
                });
                setTimeout(() => createOffer(uid), 150);
              }, 1000);
              return new Map(prev).set(uid, {
                ...stream,
                retries: stream.retries + 1,
              });
            });
          }
          break;
        }
      }
    };

    window.addEventListener("signaling:message", onMsg as any);
    return () => window.removeEventListener("signaling:message", onMsg as any);
  }, [createOffer, initPeer, removeStream, send]);

  return {
    active: Array.from(active),
    addStream,
    removeStream,
  } as const;
};
