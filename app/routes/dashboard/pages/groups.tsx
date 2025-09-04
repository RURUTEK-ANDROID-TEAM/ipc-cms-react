import { CameraGrid } from "@/components/live-view/camera-grid";
import { LayoutDropdown } from "@/components/live-view/layout-dropdown";
import type { DeviceType } from "@/components/management/schemas/schemas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebRTC } from "@/hooks/use-webrtc";
import { RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOutletContext } from "react-router";

const API_URL = "http://172.16.0.157:5000/api";

type OutletHeaderSetter = {
  setHeader?: (ctx: { title?: string; actions?: ReactNode | null }) => void;
};

type Group = {
  id: string | number;
  name: string;
  description: string;
};

const Groups = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();

  const {
    recordingState,
    toggleRecording,
    addStream,
    removeStream,
    signalingState,
    reconnect,
  } = useWebRTC();

  const [viewLayout, setViewLayout] = useState<"2x2" | "3x3" | "4x4">("2x2");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devicesByGroup, setDevicesByGroup] = useState<
    Record<string | number, DeviceType[]>
  >({});
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found. Please log in.");

      const headers = { Authorization: `Bearer ${token}` };
      const groupsRes = await fetch(`${API_URL}/groups`, { headers });

      if (!groupsRes.ok) {
        throw new Error(`Error ${groupsRes.status}: ${groupsRes.statusText}`);
      }

      const groupsData: Group[] = await groupsRes.json();
      setGroups(groupsData);
      console.log("📋 Groups fetched:", groupsData);

      // Fetch devices for each group in parallel
      const deviceFetches = groupsData.map(async (group) => {
        const res = await fetch(`${API_URL}/groups/${group.id}/devices`, {
          headers,
        });
        if (!res.ok) return [group.id, []] as const;
        const data: DeviceType[] = await res.json();
        return [group.id, data] as const;
      });

      const deviceEntries = await Promise.all(deviceFetches);
      setDevicesByGroup(Object.fromEntries(deviceEntries));
      setActiveTab(groupsData[0]?.id?.toString()); // Set default tab
    } catch (err) {
      console.error("❌ Error fetching groups:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch groups";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeTab) return;

    // Get camera UIDs for the active group
    const devices = devicesByGroup[activeTab] || [];
    const cameraUIDs = devices.map((cam) => cam.uid);

    // Add streams for cameras in the active tab
    cameraUIDs.forEach((uid) => {
      if (!recordingState[uid]) {
        // Avoid re-adding active streams
        console.log(`🆕 Adding stream for camera ${uid} in group ${activeTab}`);
        setTimeout(() => addStream(uid, "main"), 100);
      }
    });

    // Remove streams for cameras not in the active tab
    Object.values(devicesByGroup)
      .flatMap((devices) => devices.map((cam) => cam.uid))
      .forEach((uid) => {
        if (!cameraUIDs.includes(uid)) {
          console.log(
            `🗑️ Removing stream for camera ${uid} (not in active group)`
          );
          removeStream(uid);
        }
      });
  }, [activeTab, devicesByGroup, addStream, removeStream, recordingState]);

  // Clean up all streams on unmount
  useEffect(() => {
    return () => {
      Object.values(devicesByGroup)
        .flatMap((devices) => devices.map((cam) => cam.uid))
        .forEach((uid) => {
          console.log(`🗑️ Cleaning up stream for camera ${uid} on unmount`);
          removeStream(uid);
        });
    };
  }, [devicesByGroup, removeStream]);

  // Set header with refresh button
  // Set header with refresh button
  useEffect(() => {
    outlet?.setHeader?.({
      title: "Groups",
      actions: (
        <>
          <Button
            onClick={fetchGroups}
            className="bg-primary text-white rounded-full hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin ..." : ""} />
          </Button>

          {signalingState !== "connected" && (
            <Button
              onClick={reconnect}
              className="bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
              // disabled={signalingState === "connected"}
            >
              <RefreshCw className={loading ? "animate-spin ..." : ""} />
              Signaling ({signalingState})
            </Button>
          )}

          <LayoutDropdown
            viewLayout={viewLayout}
            setViewLayout={setViewLayout}
          />
        </>
      ),
    });
    return () => outlet?.setHeader?.({ title: undefined, actions: null });
  }, [viewLayout, loading, fetchGroups, signalingState, reconnect]);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Debug logging
  useEffect(() => {
    console.log("🟢 Active tab:", activeTab);
    console.log("📋 Groups:", groups);
    console.log("📷 Devices by group:", devicesByGroup);
    console.log("🎥 Recording state:", recordingState);
  }, [activeTab, groups, devicesByGroup, recordingState]);

  // // Loading state
  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       <div className="w-16 h-16 border-t-4 border-blue-600 rounded-full animate-spin" />
  //       <div className="ml-4 text-lg">Loading groups...</div>
  //     </div>
  //   );
  // }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Error Loading Groups</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
          <button
            onClick={fetchGroups}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No groups found
  if (groups.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No groups found</div>
          <div className="text-gray-400 text-sm mb-4">
            Create your first group to get started
          </div>
          <Button
            onClick={fetchGroups}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className={loading ? "animate-spin ..." : ""} />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 md:gap-6 md:px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          {groups.map((group) => (
            <TabsTrigger key={group.id} value={group.id.toString()}>
              {group.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {groups.map((group) => {
          const devices = devicesByGroup[group.id] || [];
          const cameraUIDs = devices.map((cam) => cam.uid);
          return (
            <TabsContent key={group.id} value={group.id.toString()}>
              <CameraGrid
                cameraUIDs={cameraUIDs}
                recordingState={recordingState}
                toggleRecording={toggleRecording}
                viewLayout={viewLayout}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default Groups;
