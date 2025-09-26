import { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import * as mediasoupClient from "mediasoup-client";

interface CameraStream {
  cameraId: string;
  videoElement: HTMLVideoElement | null;
  isActive: boolean;
  isRecording: boolean;
  streamType: string;
}

interface MediaSoupClient {
  device: mediasoupClient.Device | null;
  socket: Socket | null;
  consumerTransport: mediasoupClient.types.Transport | null;
  consumers: Map<string, mediasoupClient.types.Consumer>;
  currentCameraId: string | null;
}

export const useMediaSoupIPCam = (
  serverUrl: string = "https://172.16.0.157:3031"
) => {
  const clientRef = useRef<MediaSoupClient>({
    device: null,
    socket: null,
    consumerTransport: null,
    consumers: new Map(),
    currentCameraId: null,
  });

  const [connectionState, setConnectionState] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [activeStreams, setActiveStreams] = useState<Map<string, CameraStream>>(
    new Map()
  );
  const [error, setError] = useState<string | null>(null);

  // Initialize MediaSoup device
  const initDevice = useCallback(async (routerRtpCapabilities: any) => {
    try {
      if (!clientRef.current.device) {
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities });
        clientRef.current.device = device;
        console.log("MediaSoup device loaded successfully");
      }
    } catch (err) {
      console.error("Failed to load MediaSoup device:", err);
      throw err;
    }
  }, []);

  // Initialize socket connection
  const initSocket = useCallback(() => {
    if (clientRef.current.socket?.connected) return clientRef.current.socket;

    const socket = io(serverUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("Connected to MediaSoup server");
      setConnectionState("connected");
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      console.log("Disconnected from MediaSoup server");
    });

    socket.on("recordingStatus", ({ cameraId, status }) => {
      setActiveStreams((prev) => {
        const updated = new Map(prev);
        const stream = updated.get(cameraId);
        if (stream) {
          stream.isRecording = status === "recording";
          updated.set(cameraId, { ...stream });
        }
        return updated;
      });
    });

    // Correct event names from server
    socket.on("consumerClosed", ({ kind }) => {
      console.log(`Consumer ${kind} closed`);
      // Handle consumer closure - remove the consumer from local state
      clientRef.current.consumers.delete(kind);
    });

    socket.on("consumerPaused", ({ kind }) => {
      console.log(`Consumer ${kind} paused`);
      // Handle consumer pause
    });

    socket.on("consumerResumed", ({ kind }) => {
      console.log(`Consumer ${kind} resumed`);
      // Handle consumer resume
    });

    clientRef.current.socket = socket;
    return socket;
  }, [serverUrl]);

  // Create consumer transport
  const createConsumerTransport = useCallback(async () => {
    if (!clientRef.current.socket) throw new Error("Socket not connected");
    if (clientRef.current.consumerTransport) return; // Already exists

    return new Promise<void>((resolve, reject) => {
      clientRef.current.socket!.emit(
        "createTransport",
        { direction: "consumer" },
        async (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            const transport = clientRef.current.device!.createRecvTransport({
              id: response.id,
              iceParameters: response.iceParameters,
              iceCandidates: response.iceCandidates,
              dtlsParameters: response.dtlsParameters,
            });

            transport.on("connect", ({ dtlsParameters }, callback, errback) => {
              clientRef.current.socket!.emit(
                "connectTransport",
                { dtlsParameters },
                (connectResponse: any) => {
                  if (connectResponse.error) {
                    errback(new Error(connectResponse.error));
                  } else {
                    callback();
                  }
                }
              );
            });

            transport.on("connectionstatechange", (state) => {
              console.log(`Transport connection state: ${state}`);
              if (state === "failed" || state === "closed") {
                setError(`Transport connection ${state}`);
              }
            });

            clientRef.current.consumerTransport = transport;
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }, []);

  // Consume media (video or audio)
  const consumeMedia = useCallback(async (kind: "video" | "audio") => {
    if (!clientRef.current.device || !clientRef.current.consumerTransport) {
      throw new Error("Device or transport not ready");
    }

    return new Promise<mediasoupClient.types.Consumer>((resolve, reject) => {
      clientRef.current.socket!.emit(
        "consume",
        {
          rtpCapabilities: clientRef.current.device!.rtpCapabilities,
          kind,
        },
        async (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            const consumer = await clientRef.current.consumerTransport!.consume(
              {
                id: response.id,
                producerId: response.producerId,
                kind: response.kind,
                rtpParameters: response.rtpParameters,
              }
            );

            clientRef.current.consumers.set(kind, consumer);

            // Resume the consumer
            clientRef.current.socket!.emit(
              "resumeConsumer",
              { kind },
              (resumeResponse: any) => {
                if (resumeResponse.success) {
                  resolve(consumer);
                } else {
                  reject(
                    new Error(
                      resumeResponse.error || "Failed to resume consumer"
                    )
                  );
                }
              }
            );

            // Correct event names for Consumer
            consumer.on("transportclose", () => {
              console.log(`Consumer ${kind} transport closed`);
              clientRef.current.consumers.delete(kind);
            });

            // Use the correct "close" event instead of "producerclose"
            consumer.on("@close", () => {
              console.log(`Consumer ${kind} closed`);
              clientRef.current.consumers.delete(kind);
            });

            // Handle track ended
            consumer.on("trackended", () => {
              console.log(`Consumer ${kind} track ended`);
              clientRef.current.consumers.delete(kind);
            });

            // Handle consumer pause/resume
            consumer.on("@pause", () => {
              console.log(`Consumer ${kind} paused`);
            });

            consumer.on("@resume", () => {
              console.log(`Consumer ${kind} resumed`);
            });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }, []);

  // Connect to camera
  const connectToCamera = useCallback(
    async (cameraId: string, streamType: string = "sub1") => {
      try {
        setConnectionState("connecting");
        setError(null);

        // Initialize socket
        const socket = initSocket();
        await new Promise<void>((resolve) => {
          if (socket.connected) {
            resolve();
          } else {
            socket.once("connect", resolve);
          }
        });

        // Join camera room
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "joinCamera",
            { cameraId, streamType },
            async (response: any) => {
              if (response.error) {
                reject(new Error(response.error));
                return;
              }

              try {
                // Initialize MediaSoup device
                await initDevice(response.routerRtpCapabilities);

                // Create consumer transport
                await createConsumerTransport();

                clientRef.current.currentCameraId = cameraId;

                // If camera has active producers, start consuming
                if (response.hasProducers) {
                  await startConsuming(cameraId, streamType);
                } else {
                  console.log(`Camera ${cameraId} has no active producers yet`);
                  // You might want to poll or wait for producers to become available
                }

                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });

        setConnectionState("connected");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setConnectionState("disconnected");
        throw err;
      }
    },
    [initSocket, initDevice, createConsumerTransport]
  );

  // Start consuming media from camera
  const startConsuming = useCallback(
    async (cameraId: string, streamType: string) => {
      try {
        const videoConsumer = await consumeMedia("video");
        const audioConsumer = await consumeMedia("audio");

        // Create and setup video element
        const videoContainer = document.getElementById(`camera-${cameraId}`);
        if (videoContainer) {
          // Clear existing content
          videoContainer.innerHTML = "";

          const videoElement = document.createElement("video");
          videoElement.autoplay = true;
          videoElement.muted = true;
          videoElement.playsInline = true;
          videoElement.style.width = "100%";
          videoElement.style.height = "100%";
          videoElement.style.objectFit = "cover";

          const stream = new MediaStream();
          if (videoConsumer.track) stream.addTrack(videoConsumer.track);
          if (audioConsumer.track) stream.addTrack(audioConsumer.track);

          videoElement.srcObject = stream;
          videoContainer.appendChild(videoElement);

          // Handle video events
          videoElement.onloadedmetadata = () => {
            console.log(`Video loaded for camera ${cameraId}`);
          };

          videoElement.onerror = (e) => {
            console.error(`Video error for camera ${cameraId}:`, e);
            setError(`Video playback error for camera ${cameraId}`);
          };

          setActiveStreams((prev) =>
            new Map(prev).set(cameraId, {
              cameraId,
              videoElement,
              isActive: true,
              isRecording: false,
              streamType,
            })
          );
        }
      } catch (err) {
        console.error("Error starting to consume:", err);
        throw err;
      }
    },
    [consumeMedia]
  );

  // Switch camera stream type (main/sub1/sub2)
  const switchStreamType = useCallback(
    async (cameraId: string, streamType: string) => {
      try {
        if (!clientRef.current.socket) throw new Error("Socket not connected");

        // Send stream change request to server (which forwards to Go server)
        await new Promise<void>((resolve, reject) => {
          clientRef.current.socket!.emit(
            "changeStream",
            { cameraId, streamType },
            (response: any) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                // Update local stream info
                setActiveStreams((prev) => {
                  const updated = new Map(prev);
                  const stream = updated.get(cameraId);
                  if (stream) {
                    stream.streamType = streamType;
                    updated.set(cameraId, { ...stream });
                  }
                  return updated;
                });
                resolve();
              }
            }
          );
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to switch stream type"
        );
        throw err;
      }
    },
    []
  );

  // Switch to different camera
  const switchCamera = useCallback(
    async (newCameraId: string, streamType: string = "sub1") => {
      try {
        setError(null);

        // Clean up current consumers and video elements
        clientRef.current.consumers.forEach((consumer) => consumer.close());
        clientRef.current.consumers.clear();

        // Remove current video element
        if (clientRef.current.currentCameraId) {
          const currentContainer = document.getElementById(
            `camera-${clientRef.current.currentCameraId}`
          );
          if (currentContainer) {
            currentContainer.innerHTML = "";
          }
          setActiveStreams((prev) => {
            const updated = new Map(prev);
            updated.delete(clientRef.current.currentCameraId!);
            return updated;
          });
        }

        // Connect to new camera
        await connectToCamera(newCameraId, streamType);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to switch camera"
        );
        throw err;
      }
    },
    [connectToCamera]
  );

  // Toggle recording
  const toggleRecording = useCallback(
    (cameraId: string) => {
      if (!clientRef.current.socket) return;

      const stream = activeStreams.get(cameraId);
      if (!stream) return;

      const newRecordingState = !stream.isRecording;

      clientRef.current.socket.emit(
        newRecordingState ? "startRecording" : "stopRecording",
        { cameraId }
      );

      // Optimistically update UI
      setActiveStreams((prev) => {
        const updated = new Map(prev);
        const currentStream = updated.get(cameraId);
        if (currentStream) {
          currentStream.isRecording = newRecordingState;
          updated.set(cameraId, { ...currentStream });
        }
        return updated;
      });
    },
    [activeStreams]
  );

  // Disconnect from current session
  const disconnect = useCallback(() => {
    if (clientRef.current.socket) {
      clientRef.current.socket.disconnect();
      clientRef.current.socket = null;
    }

    // Clean up consumers
    clientRef.current.consumers.forEach((consumer) => consumer.close());
    clientRef.current.consumers.clear();

    // Clean up transport
    if (clientRef.current.consumerTransport) {
      clientRef.current.consumerTransport.close();
      clientRef.current.consumerTransport = null;
    }

    // Clean up video elements
    activeStreams.forEach((stream, cameraId) => {
      const container = document.getElementById(`camera-${cameraId}`);
      if (container) {
        container.innerHTML = "";
      }
    });

    setActiveStreams(new Map());
    setConnectionState("disconnected");
    clientRef.current.currentCameraId = null;
    clientRef.current.device = null;
  }, [activeStreams]);

  // Get consumer statistics
  const getStats = useCallback(
    async (cameraId: string) => {
      const stream = activeStreams.get(cameraId);
      if (!stream || !clientRef.current.consumers.size) return null;

      const stats: any = {};
      for (const [kind, consumer] of clientRef.current.consumers) {
        try {
          stats[kind] = await consumer.getStats();
        } catch (err) {
          console.warn(`Failed to get ${kind} stats:`, err);
        }
      }
      return stats;
    },
    [activeStreams]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    activeStreams: Array.from(activeStreams.values()),
    currentCameraId: clientRef.current.currentCameraId,
    error,
    connectToCamera,
    switchCamera,
    switchStreamType,
    toggleRecording,
    disconnect,
    getStats,
  } as const;
};
