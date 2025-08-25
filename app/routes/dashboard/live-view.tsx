import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";

type PeerConnections = {
  [uid: string]: RTCPeerConnection;
};

const SIGNALING_URL = "ws://172.16.0.103:9595";
const STUN_TURN_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:172.16.0.147:3478" },
    {
      urls: "turn:172.16.0.147:3478?transport=udp",
      username: "rurutek",
      credential: "ruru@123",
    },
  ],
};

const CAMERA_UIDS = ["RI35293585543679"];

const LiveView = () => {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const peerConnections = useRef<PeerConnections>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(SIGNALING_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      CAMERA_UIDS.forEach((uid, i) => {
        setTimeout(() => initializePeerConnection(uid, i), 500 * i);
      });
    };

    ws.onmessage = async (msg) => {
      let data: any;
      try {
        data = JSON.parse(msg.data);
      } catch {
        console.error("Invalid signaling message", msg.data);
        return;
      }
      handleSignal(data);
    };

    ws.onclose = () => console.log("WebSocket closed");
    ws.onerror = (err) => console.error("WebSocket error", err);

    return () => {
      ws.close();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
    };
  }, []);

  const sendSignal = (signal: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(signal));
    }
  };

  const initializePeerConnection = async (uid: string, index: number) => {
    const pc = new RTCPeerConnection(STUN_TURN_CONFIG);
    peerConnections.current[uid] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "webrtc/candidate",
          value: event.candidate.candidate,
          uid: "cus-" + uid,
        });
      }
    };

    pc.ontrack = (event) => {
      const videoEl = videoRefs.current[index];
      if (videoEl) {
        videoEl.srcObject = event.streams[0];
      }
    };

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    sendSignal({
      type: "webrtc/offer",
      value: offer.sdp,
      uid: "cus-" + uid,
    });
  };

  const handleSignal = async (data: any) => {
    const uid = data.uid?.replace("cus-", "").replace("ser-", "");
    if (!uid) return;

    const pc = peerConnections.current[uid];
    if (!pc) return;

    switch (data.type) {
      case "webrtc/candidate":
        try {
          await pc.addIceCandidate(
            new RTCIceCandidate({
              candidate: data.value,
              sdpMid: "0",
              sdpMLineIndex: 0,
            })
          );
        } catch (err) {
          console.warn("ICE candidate error", err);
        }
        break;

      case "webrtc/answer":
        try {
          if (pc.signalingState !== "stable") {
            await pc.setRemoteDescription({
              type: "answer",
              sdp: data.value,
            });
          }
        } catch (err) {
          console.error("Set remote description error", err);
        }
        break;

      case "error":
        console.error("Server error:", data);
        break;
    }
  };

  return (
    <Card className="shadow-none border-0">
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {CAMERA_UIDS.map((uid, i) => (
            <div
              key={uid}
              className="aspect-video bg-black flex items-center justify-center rounded-md"
            >
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full rounded-md object-cover"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          <Button size="icon" variant="outline">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveView;
