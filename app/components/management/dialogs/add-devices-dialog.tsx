import { useEffect, useState, useCallback, useMemo, Activity } from "react";
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
import { FormActions } from "@/components/ui/form-action-props";
import axios from "axios";
import { useNavigate } from "react-router";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { SessionTimeoutDialog } from "@/components/auth/dialogs/session-timout-dialog";
import { Label } from "@/components/ui/label";

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
  const navigate = useNavigate();

  const [cameras, setCameras] = useState<DeviceType[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(
    new Set()
  );
  const [prevAssigned, setPrevAssigned] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);

  // Fetch devices when dialog opens
  const fetchData = useCallback(async () => {
    if (!open || !group) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");

      if (token) {
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          localStorage.removeItem("accessToken");
          navigate("/");
          return;
        }
      }

      if (!token) {
        setShowSessionTimeout(true);
        return;
      }

      const [camerasRes, assignedRes] = await Promise.all([
        axios.get<DeviceType[]>(`${API_URL}/cameras`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        }),
        axios.get<DeviceType[]>(`${API_URL}/groups/${group.id}/devices`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
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

      if (token) {
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          localStorage.removeItem("accessToken");
          navigate("/");
          return;
        }
      }

      if (!token) {
        setShowSessionTimeout(true);
        return;
      }

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
              "Cache-Control": "no-cache",
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
                "Cache-Control": "no-cache",
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
          <Spinner />
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
      <div key={cam.camera_id} className="flex items-center border-b py-3">
        <Label
          className="w-full hover:bg-accent/50 flex justify-center 
                  items-center gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 
                  has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 
                  dark:has-[[aria-checked=true]]:bg-blue-950"
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
            <Activity mode={cam.model ? "visible" : "hidden"}>
              <div className="text-xs text-muted-foreground">
                Model: {cam.model} • IP: {cam.ip_address || "N/A"}
              </div>
            </Activity>
          </div>
        </Label>
      </div>
    ));
  }, [cameras, loading, selectedDevices, toggleDevice]);

  if (!group) return null;

  return (
    <>
      <Activity mode={showSessionTimeout ? "visible" : "hidden"}>
        <SessionTimeoutDialog
          open={showSessionTimeout}
          onClose={() => setShowSessionTimeout(false)}
        />
      </Activity>
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
    </>
  );
};
