import React, { useState, useEffect } from "react";
import {
  Play,
  Square,
  Video,
  VideoOff,
  Maximize2,
  Settings,
  RotateCcw,
} from "lucide-react";

// Import your hook
import { useMediaSoupIPCam } from "@/hooks/use-mediasoup-client";

interface CameraConfig {
  id: string;
  name: string;
  location?: string;
  streamTypes: string[];
}

const AVAILABLE_CAMERAS: CameraConfig[] = [
  {
    id: "RI35293585543679",
    name: "Camera 1",
    location: "Front Door",
    streamTypes: ["main"],
  },
  {
    id: "HW:IFC537",
    name: "Camera 2",
    location: "Parking Lot",
    streamTypes: ["main"],
  },
  {
    id: "HW:IFC538",
    name: "Camera 3",
    location: "Back Yard",
    streamTypes: ["main"],
  },
  {
    id: "HW:IFC539",
    name: "Camera 4",
    location: "Lobby",
    streamTypes: ["main"],
  },
];

interface CameraGridItemProps {
  camera: CameraConfig;
  isConnected: boolean;
  isRecording: boolean;
  streamType: string;
  onStreamTypeChange: (cameraId: string, streamType: string) => void;
  onToggleRecording: (cameraId: string) => void;
  onFullscreen: (cameraId: string) => void;
}

const CameraGridItem: React.FC<CameraGridItemProps> = ({
  camera,
  isConnected,
  isRecording,
  streamType,
  onStreamTypeChange,
  onToggleRecording,
  onFullscreen,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800">{camera.name}</h3>
          {camera.location && (
            <p className="text-sm text-gray-600">{camera.location}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1 text-red-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">REC</span>
            </div>
          )}
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          ></div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
        <div
          id={`camera-${camera.id}`}
          className="w-full h-full flex items-center justify-center"
        >
          {!isConnected && (
            <div className="flex flex-col items-center gap-2 text-white">
              <Video className="w-8 h-8 opacity-50" />
              <p className="text-sm">No Signal</p>
            </div>
          )}
        </div>

        {/* Overlay Controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => onFullscreen(camera.id)}
            className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-75 transition-all"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Stream Type Indicator */}
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          {streamType.toUpperCase()}
        </div>
      </div>

      {/* Controls */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <select
            value={streamType}
            onChange={(e) => onStreamTypeChange(camera.id, e.target.value)}
            className="text-xs p-1 border border-gray-300 rounded flex-1"
            disabled={!isConnected}
          >
            <option value="main">High</option>
            <option value="sub1">Medium</option>
            <option value="sub2">Low</option>
          </select>

          <button
            onClick={() => onToggleRecording(camera.id)}
            disabled={!isConnected}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors disabled:opacity-50 ${
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isRecording ? (
              <Square className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isRecording ? "Stop" : "Rec"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MultiCameraGrid: React.FC = () => {
  const [connectedCameras, setConnectedCameras] = useState<Set<string>>(
    new Set()
  );
  const [streamTypes, setStreamTypes] = useState<Record<string, string>>({});
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);

  // Initialize stream types
  useEffect(() => {
    const initialStreamTypes: Record<string, string> = {};
    AVAILABLE_CAMERAS.forEach((camera) => {
      initialStreamTypes[camera.id] = "main"; // Default to main quality
    });
    setStreamTypes(initialStreamTypes);
  }, []);

  const {
    connectionState,
    activeStreams,
    connectToCamera,
    switchStreamType,
    toggleRecording,
    disconnect,
  } = useMediaSoupIPCam("https://172.16.0.157:3031");

  // Connect to all cameras on mount
  useEffect(() => {
    if (connectionState === "connected") {
      AVAILABLE_CAMERAS.forEach((camera) => {
        if (!connectedCameras.has(camera.id)) {
          connectToCamera(camera.id, streamTypes[camera.id] || "main")
            .then(() => {
              setConnectedCameras((prev) => new Set(prev).add(camera.id));
            })
            .catch((err) => {
              console.error(`Failed to connect to camera ${camera.id}:`, err);
            });
        }
      });
    }
  }, [connectionState, connectToCamera, streamTypes, connectedCameras]);

  const handleStreamTypeChange = async (
    cameraId: string,
    streamType: string
  ) => {
    try {
      await switchStreamType(cameraId, streamType);
      setStreamTypes((prev) => ({ ...prev, [cameraId]: streamType }));
    } catch (err) {
      console.error(`Failed to change stream type for ${cameraId}:`, err);
    }
  };

  const handleToggleRecording = (cameraId: string) => {
    toggleRecording(cameraId);
  };

  const handleFullscreen = (cameraId: string) => {
    setFullscreenCamera(cameraId);
  };

  const handleExitFullscreen = () => {
    setFullscreenCamera(null);
  };

  const getActiveStream = (cameraId: string) => {
    return activeStreams.find((stream) => stream.cameraId === cameraId);
  };

  const isConnected = (cameraId: string) => {
    const stream = getActiveStream(cameraId);
    return stream?.isActive || false;
  };

  const isRecording = (cameraId: string) => {
    const stream = getActiveStream(cameraId);
    return stream?.isRecording || false;
  };

  // Fullscreen Modal
  if (fullscreenCamera) {
    const camera = AVAILABLE_CAMERAS.find((c) => c.id === fullscreenCamera);
    const stream = getActiveStream(fullscreenCamera);

    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Fullscreen Header */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{camera?.name}</h2>
            {camera?.location && (
              <p className="text-gray-300">{camera.location}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {stream?.isRecording && (
              <div className="flex items-center gap-2 text-red-400">
                <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                <span className="font-medium">RECORDING</span>
              </div>
            )}
            <button
              onClick={handleExitFullscreen}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              Exit Fullscreen
            </button>
          </div>
        </div>

        {/* Fullscreen Video */}
        <div className="flex-1 relative">
          <div
            id={`camera-${fullscreenCamera}`}
            className="w-full h-full flex items-center justify-center bg-black"
          >
            {!isConnected(fullscreenCamera) && (
              <div className="flex flex-col items-center gap-4 text-white">
                <Video className="w-16 h-16 opacity-50" />
                <p className="text-xl">No Signal</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Security Camera System
        </h1>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 ${
              connectionState === "connected"
                ? "text-green-600"
                : connectionState === "connecting"
                  ? "text-yellow-600"
                  : "text-red-600"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                connectionState === "connected"
                  ? "bg-green-500"
                  : connectionState === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
            ></div>
            <span className="font-medium">Server {connectionState}</span>
          </div>
          <div className="text-gray-600">
            {connectedCameras.size}/{AVAILABLE_CAMERAS.length} cameras connected
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {AVAILABLE_CAMERAS.map((camera) => (
          <CameraGridItem
            key={camera.id}
            camera={camera}
            isConnected={isConnected(camera.id)}
            isRecording={isRecording(camera.id)}
            streamType={streamTypes[camera.id] || "main"}
            onStreamTypeChange={handleStreamTypeChange}
            onToggleRecording={handleToggleRecording}
            onFullscreen={handleFullscreen}
          />
        ))}
      </div>

      {/* Global Controls */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">
          System Controls
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => {
              AVAILABLE_CAMERAS.forEach((camera) => {
                if (isConnected(camera.id)) {
                  toggleRecording(camera.id);
                }
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            <Play className="w-4 h-4" />
            Record All
          </button>

          <button
            onClick={() => {
              AVAILABLE_CAMERAS.forEach((camera) => {
                if (isRecording(camera.id)) {
                  toggleRecording(camera.id);
                }
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop All Recording
          </button>

          <button
            onClick={() => {
              disconnect();
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reconnect All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiCameraGrid;
