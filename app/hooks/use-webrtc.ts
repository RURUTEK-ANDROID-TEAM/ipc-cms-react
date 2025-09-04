import { useCallback, useEffect, useState } from "react";
import { useSignalingServer } from "./use-signaling-server";
import { useWebRTCClient } from "./use-webrtc-client";

type RecordingState = {
  [uid: string]: boolean; // Map of camera UID to recording status
};

const DEFAULT_SIGNALING_URL = "ws://172.16.0.157:9595/wsse";

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:172.16.0.147:3478" },
    {
      urls: "turn:172.16.0.147:3478?transport=udp",
      username: "rurutek",
      credential: "ruru@123",
    },
    {
      urls: "turn:172.16.0.147:3478?transport=tcp",
      username: "rurutek",
      credential: "ruru@123",
    },
  ],
};

export const useWebRTC = () => {
  // Initialize signaling server
  const {
    state: signalingState,
    send,
    reconnect,
  } = useSignalingServer(DEFAULT_SIGNALING_URL);

  // Initialize WebRTC client
  const { active, addStream, removeStream } = useWebRTCClient(
    DEFAULT_ICE,
    send
  );

  // Manage recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({});

  // Handle recording state updates from signaling server
  useEffect(() => {
    const onMsg = (e: CustomEvent) => {
      const data = e.detail;
      const uid: string | undefined = data?.uid
        ?.replace("cus-", "")
        .replace("ser-", "");
      if (!uid) return;

      if (data.type === "recording/status") {
        setRecordingState((prev) => ({
          ...prev,
          [uid]: data.value === "recording",
        }));
      }
    };

    window.addEventListener("signaling:message", onMsg as EventListener);
    return () =>
      window.removeEventListener("signaling:message", onMsg as EventListener);
  }, []);

  // Toggle recording for a specific camera
  const toggleRecording = useCallback(
    (uid: string) => {
      setRecordingState((prev) => {
        const isRecording = !prev[uid];
        send({
          type: isRecording ? "startRecording" : "stopRecording",
          uid: `cus-${uid}`,
        });
        return { ...prev, [uid]: isRecording };
      });
    },
    [send]
  );

  return {
    signalingState, // Expose signaling state for UI feedback
    activeStreams: active, // Array of active stream UIDs
    recordingState, // Map of UID to recording status
    toggleRecording,
    addStream,
    removeStream,
    reconnect,
  } as const;
};
