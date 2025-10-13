import { Activity, useEffect, useRef, useState, type FormEvent } from "react";
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
import { Group } from "lucide-react";

export const AddGroupForm = ({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!loading && !error && formRef.current) {
      formRef.current.reset();
      setName("");
      setDescription("");
    }
  }, [loading, error]);

  const canSubmit = name && description;

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <DialogHeader className="mb-4">
        <DialogTitle>Add Group</DialogTitle>
        <DialogDescription>
          Create a new group to organize your devices.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <Activity mode={error ? "visible" : "hidden"}>
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        </Activity>
        <div className="grid gap-3">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
            placeholder="Group name"
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            name="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            required
            placeholder="Brief description of the group"
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
          disabled={loading || !canSubmit}
          className="dark:text-white"
        >
          <Group />
          {loading ? "Adding..." : "Add Group"}
        </Button>
      </DialogFooter>
    </form>
  );
};
