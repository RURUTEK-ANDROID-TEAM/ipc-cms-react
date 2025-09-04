import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { LayoutDropdown } from "@/components/live-view/layout-dropdown";
import { CameraGrid } from "@/components/live-view/camera-grid";
import type { DeviceType } from "@/components/management/schemas/schemas";
import { useWebRTC } from "@/hooks/use-webrtc";

const API_URL = "http://172.16.0.157:5000/api";

type OutletHeaderSetter = {
  setHeader?: (ctx: { title?: string; actions?: ReactNode | null }) => void;
};

const LiveView = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();
  const [viewLayout, setViewLayout] = useState<"2x2" | "3x3" | "4x4">("2x2");

  // Get WebRTC functions (no camera UIDs from here)
  const {
    activeStreams,
    recordingState,
    toggleRecording,
    addStream,
    removeStream,
  } = useWebRTC();

  // Local state for camera management
  const [cameraUIDs, setCameraUIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<DeviceType[]>([]);

  // Fetch cameras from external API
  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No access token found. Please log in.");
      }

      const headers = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${API_URL}/cameras`, { headers });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const fetchedCameras: DeviceType[] = await response.json();
      console.log("📷 Cameras fetched from API:", fetchedCameras);

      setCameras(fetchedCameras);
      const newUIDs = fetchedCameras.map((cam) => cam.uid);

      // Update camera UIDs
      setCameraUIDs((prevUIDs) => {
        // Remove streams for cameras that are no longer available
        prevUIDs.forEach((uid) => {
          if (!newUIDs.includes(uid)) {
            console.log(
              `🗑️ Camera ${uid} no longer available, removing stream`
            );
            removeStream(uid);
          }
        });

        // Add streams for new cameras
        newUIDs.forEach((uid) => {
          if (!prevUIDs.includes(uid)) {
            console.log(`🆕 New camera ${uid} detected, adding stream`);
            // Add a small delay to ensure DOM is ready
            setTimeout(() => addStream(uid, "main"), 100);
          }
        });

        return newUIDs;
      });
    } catch (err) {
      console.error("❌ Error fetching cameras:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch cameras";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [addStream, removeStream]);

  // Refresh streams for existing cameras
  const refreshStreams = useCallback(() => {
    console.log("🔄 Refreshing all streams...");
    cameraUIDs.forEach((uid) => {
      removeStream(uid);
      setTimeout(() => addStream(uid, "main"), 500);
    });
  }, [cameraUIDs, addStream, removeStream]);

  // Set header with refresh button
  useEffect(() => {
    outlet?.setHeader?.({
      title: "Live View",
      actions: (
        <>
          <Button
            onClick={fetchCameras}
            className="bg-primary text-white rounded hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Cameras
          </Button>
          <Button
            onClick={refreshStreams}
            className="bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            disabled={cameraUIDs.length === 0}
          >
            <RefreshCw />
            Streams
          </Button>
          <LayoutDropdown
            viewLayout={viewLayout}
            setViewLayout={setViewLayout}
          />
        </>
      ),
    });
    return () => outlet?.setHeader?.({ title: "Live View", actions: null });
  }, [viewLayout, loading, fetchCameras, refreshStreams, cameraUIDs.length]);

  // Initialize cameras on mount
  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Debug active streams
  useEffect(() => {
    console.log("🟢 Active streams:", activeStreams);
    console.log("📋 All camera UIDs:", cameraUIDs);
  }, [activeStreams, cameraUIDs]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-600 rounded-full animate-spin" />
        <div className="ml-4 text-lg">Loading cameras...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error Loading Cameras</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
          <button
            onClick={fetchCameras}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No cameras found
  if (cameraUIDs.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No cameras found</div>
          <div className="text-gray-400 text-sm mb-4">
            Make sure cameras are connected and configured properly
          </div>
          <button
            onClick={fetchCameras}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Cameras
          </button>
        </div>
      </div>
    );
  }

  return (
    <CameraGrid
      cameraUIDs={cameraUIDs}
      recordingState={recordingState}
      toggleRecording={toggleRecording}
      viewLayout={viewLayout}
    />
  );
};

export default LiveView;
