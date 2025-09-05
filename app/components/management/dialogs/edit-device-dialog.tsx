import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import type { DeviceType } from "../schemas/schemas";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";

export const EditDeviceDialog = ({
  device,
  open,
  onOpenChange,
  onSave,
}: {
  device: DeviceType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedDevice: Partial<DeviceType>) => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    uid: "",
    mac_address: "",
    ip_address: "",
    model: "",
    manufacturer: "",
    serial_number: "",
  });

  useEffect(() => {
    if (open && device) {
      setFormData({
        uid: device.uid || "",
        mac_address: device.mac_address || "",
        ip_address: device.ip_address || "",
        model: device.model || "",
        manufacturer: device.manufacturer || "",
        serial_number: device.serial_number || "",
      });
      setError(null);
    }
  }, [open, device]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!device) return;

    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
      toast.success("Device updated successfully");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update device";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update the device's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-3">
              <Label htmlFor="edit-uid">UID</Label>
              <Input
                id="edit-uid"
                value={formData.uid}
                onChange={(e) =>
                  setFormData({ ...formData, uid: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-mac">MAC Address</Label>
              <Input
                id="edit-mac"
                value={formData.mac_address}
                onChange={(e) =>
                  setFormData({ ...formData, mac_address: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-ip">IP Address</Label>
              <Input
                id="edit-ip"
                value={formData.ip_address}
                onChange={(e) =>
                  setFormData({ ...formData, ip_address: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-manufacturer">Manufacturer</Label>
              <Input
                id="edit-manufacturer"
                value={formData.manufacturer}
                onChange={(e) =>
                  setFormData({ ...formData, manufacturer: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-serial">Serial Number</Label>
              <Input
                id="edit-serial"
                value={formData.serial_number}
                onChange={(e) =>
                  setFormData({ ...formData, serial_number: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="dark:text-white"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
