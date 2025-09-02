import { useEffect, useState, type FormEvent } from "react";
import type { GroupType } from "../schemas/schemas";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

export const EditGroupDialog = ({
  group,
  open,
  onOpenChange,
  onSave,
}: {
  group: GroupType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedGroup: Partial<GroupType>) => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (open && group) {
      setFormData({
        name: group.name,
        description: group.description,
      });
      setError(null);
    }
  }, [open, group]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!group) return;

    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
      toast.success("Group updated successfully");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update group";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update the group's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-3">
              <Label htmlFor="edit-group-name">Name</Label>
              <Input
                id="edit-group-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={loading}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-group-description">Description</Label>
              <Input
                id="edit-group-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={loading}
                required
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
