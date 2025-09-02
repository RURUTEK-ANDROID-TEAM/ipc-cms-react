import { useEffect, useRef, type FormEvent } from "react";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { UserPlus } from "lucide-react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Button } from "../../ui/button";

export const AddUserForm = ({
  onSubmit,
  loading,
  error,
  role,
  setRole,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  role: string;
  setRole: (role: string) => void;
}) => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!loading && !error && formRef.current) {
      formRef.current.reset();
    }
  }, [loading, error]);

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <DialogHeader className="mb-4">
        <DialogTitle>Add User</DialogTitle>
        <DialogDescription>
          Fill in the details below to create a new user account.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}
        <div className="grid gap-3">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            required
            disabled={loading}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            disabled={loading}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="role">Role</Label>
          <Select
            name="role"
            value={role}
            onValueChange={setRole}
            required
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Role</SelectLabel>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <DialogClose asChild>
          <Button variant="outline" disabled={loading}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={loading || !role}>
          <UserPlus />
          {loading ? "Adding..." : "Add User"}
        </Button>
      </DialogFooter>
    </form>
  );
};
