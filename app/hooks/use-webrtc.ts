import { useCallback, useEffect, useState } from "react";
import { useSignalingServer } from "./use-signaling-server";
import { useWebRTCClient } from "./use-webrtc-client";

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

type RecordingState = { [uid: string]: boolean };
type CameraState = {
  [uid: string]: { connected: boolean; producerId?: string; metadata: any };
};

export const useWebRTC = () => {
  const {
    state: signalingState,
    send,
    reconnect,
  } = useSignalingServer(DEFAULT_SIGNALING_URL);
  const {
    active: activeStreams,
    addStream,
    removeStream,
  } = useWebRTCClient(DEFAULT_ICE, send);
  const [recordingState, setRecordingState] = useState<RecordingState>({});
  const [cameraState, setCameraState] = useState<CameraState>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onMsg = (e: CustomEvent) => {
      const data = e.detail;
      const uid: string | undefined = data?.uid
        ?.replace("cus-", "")
        .replace("ser-", "");
      if (!uid) return;

      switch (data.type) {
        case "welcomeAck":
          setCameraState((prev) => ({
            ...prev,
            [uid]: {
              connected: true,
              metadata: data.metadata || {},
              producerId: prev[uid]?.producerId,
            },
          }));
          break;
        case "newProducer":
          setCameraState((prev) => ({
            ...prev,
            [uid]: {
              connected: true,
              metadata: prev[uid]?.metadata || {},
              producerId: data.producerId,
            },
          }));
          addStream(uid, data.category || "main");
          break;
        case "producerClosed":
          setCameraState((prev) => ({
            ...prev,
            [uid]: {
              connected: false,
              metadata: prev[uid]?.metadata || {},
              producerId: undefined,
            },
          }));
          setRecordingState((prev) => ({ ...prev, [uid]: false }));
          removeStream(uid);
          break;
        case "recording/status":
          setRecordingState((prev) => ({
            ...prev,
            [uid]: data.recording,
          }));
          break;
        case "error":
          setError(`Error for ${uid}: ${data.message}`);
          break;
      }
    };

    window.addEventListener("signaling:message", onMsg as EventListener);
    return () =>
      window.removeEventListener("signaling:message", onMsg as EventListener);
  }, [addStream, removeStream]);

  const toggleRecording = useCallback(
    (uid: string, producerId: string | undefined) => {
      if (!producerId) {
        setError(`Cannot toggle recording for ${uid}: no producer available`);
        return;
      }
      send({
        type: recordingState[uid] ? "stopRecording" : "startRecording",
        uid: `cus-${uid}`,
        cameraUid: uid,
        producerId,
      });
    },
    [send, recordingState]
  );

  return {
    signalingState,
    activeStreams,
    recordingState,
    cameraState,
    error,
    toggleRecording,
    addStream,
    removeStream,
    reconnect,
  } as const;
};
