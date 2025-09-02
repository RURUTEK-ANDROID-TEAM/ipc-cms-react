import { useEffect, useState } from "react";
import type { DeviceType, GroupType } from "../schemas/schemas";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Checkbox } from "../../ui/checkbox";
import { Button } from "../../ui/button";

const API_URL = "http://172.16.0.157:5000/api";

interface AddDevicesDialogProps {
  group: GroupType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------- Add Devices Dialog Component ----------------
export const AddDevicesDialog = ({
  group,
  open,
  onOpenChange,
}: AddDevicesDialogProps) => {
  const [cameras, setCameras] = useState<DeviceType[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(
    new Set()
  );
  const [prevAssigned, setPrevAssigned] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch devices when dialog opens
  useEffect(() => {
    if (!open || !group) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No access token found");

        const camerasRes = await fetch(`${API_URL}/cameras`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const assignedRes = await fetch(
          `${API_URL}/groups/${group.id}/devices`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!camerasRes.ok || !assignedRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const camerasData: DeviceType[] = await camerasRes.json();
        const assignedData: DeviceType[] = await assignedRes.json();

        setCameras(camerasData);

        // ✅ Always use camera_id
        const assignedSet = new Set(assignedData.map((cam) => cam.camera_id));
        setSelectedDevices(assignedSet);
        setPrevAssigned(assignedSet);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load cameras");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, group]);

  const toggleDevice = (cameraId: number) => {
    setSelectedDevices((prev) => {
      const copy = new Set(prev);
      if (copy.has(cameraId)) copy.delete(cameraId);
      else copy.add(cameraId);
      return copy;
    });
  };

  const handleSave = async () => {
    if (!group) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found");

      const current = Array.from(selectedDevices);
      const previous = Array.from(prevAssigned);

      const toAdd = current.filter((id) => !prevAssigned.has(id));
      const toRemove = previous.filter((id) => !selectedDevices.has(id));

      // 🔴 Remove unchecked
      if (toRemove.length > 0) {
        const deleteRes = await fetch(`${API_URL}/groups/${group.id}/devices`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cameraIds: toRemove }),
        });

        if (!deleteRes.ok) throw new Error("Failed to remove devices");
      }

      // 🟢 Add newly checked
      if (toAdd.length > 0) {
        const response = await fetch(`${API_URL}/groups/${group.id}/devices`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cameraIds: toAdd }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to add devices");
        }
      }

      toast.success("Devices updated successfully");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update devices"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Devices for {group.name}</DialogTitle>
          <DialogDescription>
            Select the devices you want to assign to this group.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {cameras.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No cameras available
              </div>
            ) : (
              cameras.map((cam) => (
                <div
                  key={cam.camera_id}
                  className="flex items-center gap-3 border-b py-3"
                >
                  <Checkbox
                    checked={selectedDevices.has(cam.camera_id)}
                    onCheckedChange={() => toggleDevice(cam.camera_id)}
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {cam.uid || "Unknown UID"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Serial: {cam.serial_number || "No Serial"} • MAC:{" "}
                      {cam.mac_address || "No MAC"}
                    </div>
                    {cam.model && (
                      <div className="text-xs text-muted-foreground">
                        Model: {cam.model} • IP: {cam.ip_address || "N/A"}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{selectedDevices.size} device(s) selected</span>
          <span>{cameras.length} total devices</span>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
