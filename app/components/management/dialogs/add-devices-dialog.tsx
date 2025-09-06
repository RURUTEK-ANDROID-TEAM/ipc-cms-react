import { useEffect, useState, useCallback, useMemo } from "react";
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
import { FormActions } from "@/components/ui/form-action-props";
import axios from "axios";

const API_URL = "http://172.16.0.157:5000/api";

interface AddDevicesDialogProps {
  group: GroupType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const fetchData = useCallback(async () => {
    if (!open || !group) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found");

      const [camerasRes, assignedRes] = await Promise.all([
        axios.get<DeviceType[]>(`${API_URL}/cameras`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get<DeviceType[]>(`${API_URL}/groups/${group.id}/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setCameras(camerasRes.data);

      const assignedSet = new Set(assignedRes.data.map((cam) => cam.camera_id));
      setSelectedDevices(assignedSet);
      setPrevAssigned(assignedSet);
    } catch (e: any) {
      console.error("Failed to load cameras:", e);
      toast.error(e.response?.data?.message || "Failed to load cameras");
    } finally {
      setLoading(false);
    }
  }, [open, group]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDevice = useCallback((cameraId: number) => {
    setSelectedDevices((prev) => {
      const copy = new Set(prev);
      copy.has(cameraId) ? copy.delete(cameraId) : copy.add(cameraId);
      return copy;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!group) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) throw new Error("No access token found");

      const current = Array.from(selectedDevices);
      const previous = Array.from(prevAssigned);

      const toAdd = current.filter((id) => !prevAssigned.has(id));
      const toRemove = previous.filter((id) => !selectedDevices.has(id));

      const requests: Promise<any>[] = [];

      if (toRemove.length > 0) {
        requests.push(
          axios.delete(`${API_URL}/groups/${group.id}/devices`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            data: { cameraIds: toRemove }, // ✅ axios delete requires "data"
          })
        );
      }

      if (toAdd.length > 0) {
        requests.push(
          axios.post(
            `${API_URL}/groups/${group.id}/devices`,
            { cameraIds: toAdd },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          )
        );
      }

      await Promise.all(requests);

      toast.success("Devices updated successfully");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to update devices:", err);
      toast.error(err.response?.data?.message || "Failed to update devices");
    } finally {
      setLoading(false);
    }
  }, [group, selectedDevices, prevAssigned, onOpenChange]);

  const deviceList = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (cameras.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No cameras available
        </div>
      );
    }

    return cameras.map((cam) => (
      <div
        key={cam.camera_id}
        className="flex items-center gap-3 border-b py-3"
      >
        <Checkbox
          className="h-5 w-5 dark:text-white"
          checked={selectedDevices.has(cam.camera_id)}
          onCheckedChange={() => toggleDevice(cam.camera_id)}
          disabled={loading}
        />
        <div className="flex-1">
          <div className="font-medium">{cam.uid || "Unknown UID"}</div>
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
    ));
  }, [cameras, loading, selectedDevices, toggleDevice]);

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
        <div className="max-h-80 overflow-y-auto space-y-2">{deviceList}</div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{selectedDevices.size} device(s) selected</span>
          <span>{cameras.length} total devices</span>
        </div>
        <DialogFooter>
          <FormActions
            loading={loading}
            onCancel={() => onOpenChange(false)}
            onSave={handleSave}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
