import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Video } from "lucide-react";

export const AddDeviceForm = ({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [macAddress, setMacAddress] = useState("");
  const [uid, setUid] = useState("");

  useEffect(() => {
    if (!loading && !error && formRef.current) {
      formRef.current.reset();
      setMacAddress("");
      setUid("");
    }
  }, [loading, error]);

  const canSubmit = macAddress || uid;

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <DialogHeader className="mb-4">
        <DialogTitle>Add Device</DialogTitle>
        <DialogDescription>
          Provide at least one unique identifier to add a device.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}
        <div className="grid gap-3">
          <Label htmlFor="macAddress">MAC Address</Label>
          <Input
            id="mac_address"
            name="mac_address"
            type="text"
            value={macAddress}
            onChange={(e) => setMacAddress(e.target.value)}
            disabled={loading}
            placeholder="e.g., 00:11:22:33:44:55"
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="uid">UID</Label>
          <Input
            id="uid"
            name="uid"
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            disabled={loading}
            placeholder="Device unique identifier"
          />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <DialogClose asChild>
          <Button variant="outline" disabled={loading}>
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="dark:text-white"
          disabled={loading || !canSubmit}
        >
          <Video />
          {loading ? "Adding..." : "Add Device"}
        </Button>
      </DialogFooter>
    </form>
  );
};
