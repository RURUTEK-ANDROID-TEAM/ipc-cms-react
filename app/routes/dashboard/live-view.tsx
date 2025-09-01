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
  const isConnecting = useRef<boolean>(false);
  const streamLocks = useRef<Map<string, boolean>>(new Map());
  const pendingStreams = useRef<Map<string, MediaStream[]>>(new Map()); // Queue streams during lock

  const flushQueue = useCallback(() => {
    if (signalingWS.current?.readyState === WebSocket.OPEN) {
      messageQueue.current.forEach((msg) =>
        signalingWS.current!.send(JSON.stringify(msg))
      );
      messageQueue.current = [];
    }
  }, []);

  const sendSignal = useCallback((signal: any) => {
    if (signalingWS.current?.readyState === WebSocket.OPEN) {
      try {
        signalingWS.current.send(JSON.stringify(signal));
      } catch (error) {
        console.error("Error sending signal:", error, signal);
        messageQueue.current.push(signal);
      }
    } else {
      console.warn("WebSocket not open, queuing signal", signal);
      messageQueue.current.push(signal);
    }
  }, []);

  const connectSignalingWS = useCallback(() => {
    if (
      isConnecting.current ||
      signalingWS.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    isConnecting.current = true;
    const ws = new WebSocket(SIGNALING_URL);
    ws.binaryType = "arraybuffer";
    signalingWS.current = ws;

    ws.onopen = () => {
      console.log("✅ Signaling WebSocket connected");
      isConnecting.current = false;
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
      isConnecting.current = false;
      setTimeout(connectSignalingWS, 3000);
    };

    ws.onerror = (err) => {
      console.error("❌ Signaling WebSocket error:", err);
      isConnecting.current = false;
    };
  }, []);

  const initializePeerConnection = useCallback(
    (uid: string) => {
      if (peerConnections.current[uid]) {
        peerConnections.current[uid].close();
        delete peerConnections.current[uid];
        videoRefs.current.delete(uid);
        streamLocks.current.delete(uid);
        pendingStreams.current.delete(uid);
      }

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

      pc.ontrack = async (event) => {
        console.log(
          `🎥 Received track for ${uid} at ${new Date().toISOString()}`
        );
        if (!event.streams[0]) {
          console.warn("No stream received for", uid);
          return;
        }

        if (streamLocks.current.get(uid)) {
          console.warn(
            "Stream assignment in progress for",
            uid,
            "queuing stream..."
          );
          if (!pendingStreams.current.get(uid)) {
            pendingStreams.current.set(uid, []);
          }
          pendingStreams.current.get(uid)!.push(event.streams[0]);
          return;
        }

        streamLocks.current.set(uid, true);
        try {
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

          if (video.srcObject !== event.streams[0]) {
            video.srcObject = event.streams[0];
            try {
              await new Promise((resolve) => {
                video.onloadedmetadata = resolve;
              });
              await video.play();
              console.log("✅ Video playing for", uid);
            } catch (e) {
              console.error("play() failed for", uid, e);
            }
          }

          // Process any queued streams
          const queuedStreams = pendingStreams.current.get(uid) || [];
          for (const queuedStream of queuedStreams) {
            if (video.srcObject !== queuedStream) {
              video.srcObject = queuedStream;
              try {
                await new Promise((resolve) => {
                  video.onloadedmetadata = resolve;
                });
                await video.play();
                console.log("✅ Queued video playing for", uid);
              } catch (e) {
                console.error("play() failed for queued stream", uid, e);
              }
            }
          }
          pendingStreams.current.delete(uid);
        } finally {
          streamLocks.current.delete(uid);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE", uid, "->", pc.iceConnectionState);
        if (
          ["failed", "disconnected", "closed"].includes(pc.iceConnectionState)
        ) {
          console.warn("ICE connection issue for", uid, pc.iceConnectionState);
          pc.close();
          delete peerConnections.current[uid];
          videoRefs.current.delete(uid);
          streamLocks.current.delete(uid);
          pendingStreams.current.delete(uid);
          setTimeout(() => {
            initializePeerConnection(uid);
            setTimeout(() => changeStream("main", uid), 500);
          }, 1000); // Delay reinitialization to avoid rapid cycling
        }
      };

      createOffer(uid);
    },
    [sendSignal]
  );

  const createOffer = useCallback(
    async (uid: string) => {
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
    },
    [sendSignal]
  );

  const handleWebSocketMessage = useCallback(
    async (data: any) => {
      const uid = data.uid?.replace("cus-", "").replace("ser-", "");
      if (!uid) return;
      const pc = peerConnections.current[uid];
      if (!pc) return;

      switch (data.type) {
        case "webrtc/candidate":
          try {
            console.log("📥 Adding ICE candidate for", uid);

            let candidateInit: RTCIceCandidateInit;

            // If the server sends a string, wrap it
            if (typeof data.value === "string") {
              candidateInit = {
                candidate: data.value,
                sdpMid: "0",
                sdpMLineIndex: 0,
              };
            } else {
              candidateInit = {
                candidate: data.value.candidate || "",
                sdpMid: data.value.sdpMid ?? "0",
                sdpMLineIndex: data.value.sdpMLineIndex ?? 0,
              };
            }

            if (pc.remoteDescription && pc.signalingState !== "closed") {
              await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
            } else {
              if (!pendingCandidates.current[uid]) {
                pendingCandidates.current[uid] = [];
              }
              pendingCandidates.current[uid].push(candidateInit);
            }
          } catch (error) {
            console.warn("Error adding ICE candidate for", uid, error);
          }
          break;
        case "webrtc/answer":
          try {
            if (pc.signalingState === "have-local-offer") {
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
              console.warn(
                "Ignoring answer in signaling state",
                pc.signalingState,
                "for",
                uid
              );
            }
          } catch (error) {
            console.warn("Error setting remote description for", uid, error);
          }
          break;

        case "error":
          console.error("Server error for", uid, data);
          pc.close();
          delete peerConnections.current[uid];
          videoRefs.current.delete(uid);
          streamLocks.current.delete(uid);
          pendingStreams.current.delete(uid);
          initializePeerConnection(uid);
          setTimeout(() => changeStream("main", uid), 500);
          break;
      }
    },
    [initializePeerConnection]
  );

  const changeStream = useCallback(
    (streamType: string, uid: string) => {
      console.log(`Changing stream to: ${streamType} for`, uid);
      sendSignal({
        type: "changeStream",
        value: streamType,
        uid: "cus-" + uid,
      });
    },
    [sendSignal]
  );

  const addStream = useCallback(
    (uid: string, streamType: string) => {
      if (
        !signalingWS.current ||
        signalingWS.current.readyState !== WebSocket.OPEN
      ) {
        console.warn("WebSocket not open, initializing...");
        connectSignalingWS();
        setTimeout(() => addStream(uid, streamType), 1000);
        return;
      }

      if (!peerConnections.current[uid]) {
        initializePeerConnection(uid);
        setTimeout(() => changeStream(streamType, uid), 500);
      } else {
        changeStream(streamType, uid);
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
    return () => outlet?.setHeader?.({ title: "Live View", actions: null });
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
              streamLocks.current.delete(uid);
              pendingStreams.current.delete(uid);
            }
          });
        }
      } catch (err) {
        console.error("Error processing camera status:", err);
      }
    };

    camDataWS.onerror = (err) => {
      console.error("Camera data WebSocket error:", err);
      camDataWS.close();
    };

    camDataWS.onclose = () => {
      console.log("Camera data WebSocket closed, reconnecting...");
      setTimeout(() => {
        const newWS = new WebSocket(DASHBOARD_WS_URL);
        camDataWS.onmessage = newWS.onmessage;
        camDataWS.onerror = newWS.onerror;
        camDataWS.onclose = newWS.onclose;
      }, 3000);
    };

    connectSignalingWS();

    return () => {
      camDataWS.close();
      signalingWS.current?.close();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      peerConnections.current = {};
      videoRefs.current.clear();
      streamLocks.current.clear();
      pendingStreams.current.clear();
    };
  }, [connectSignalingWS]);

  useEffect(() => {
    cameraUIDs.forEach((uid) => {
      if (!peerConnections.current[uid]) {
        addStream(uid, "main");
      }
    });
  }, [cameraUIDs, addStream]);

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
                  <div className="absolute bottom-0 left-0 right-0 text-white text-xs px-3 py-2 flex flex-col gap-0.5">
                    <div className="font-medium truncate">
                      {uid || "Unknown UID"}
                    </div>
                  </div>
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
