import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconEdit,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
  IconTrash,
  IconUser,
  IconUserPentagon,
  IconUserStar,
} from "@tabler/icons-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Group, UserPlus, Video } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_URL = "http://172.16.0.157:5000/api";

// ---------------- Schemas ----------------
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const deviceSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  user_id: z.number(),
  camera_id: z.number(),
  uid: z.string(),
  mac_address: z.string(),
  ip_address: z.string(),
  firmware_version: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  serial_number: z.string(),
  hardware_id: z.string(),
  assigned_at: z.string(),
});

export const groupSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  created_at: z.string(),
});

// Type definitions
type User = z.infer<typeof userSchema>;
type Device = z.infer<typeof deviceSchema>;
type Group = z.infer<typeof groupSchema>;

interface AddDevicesDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------- Delete Confirmation Dialog ----------
function DeleteConfirmationDialog({
  open,
  openChange,
  onConfirm,
  loading,
  title,
  description,
}: {
  open: boolean;
  openChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={openChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground text-white hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------- Edit User Dialog ----------------
function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSave,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedUser: Partial<User>) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    role: "",
  });

  useEffect(() => {
    if (open && user) {
      setFormData({
        username: user.username,
        role: user.role,
      });
      setError(null);
    }
  }, [open, user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
      toast.success("User updated successfully");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update user";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update the user's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
            <div className="grid gap-3">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={loading}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Role</SelectLabel>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
}

// ---------------- Edit Device Dialog ----------------
function EditDeviceDialog({
  device,
  open,
  onOpenChange,
  onSave,
}: {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedDevice: Partial<Device>) => Promise<void>;
}) {
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Edit Group Dialog ----------------
function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onSave,
}: {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedGroup: Partial<Group>) => Promise<void>;
}) {
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
}

// ---------------- Action Cell Component ----------------
type ActionCellProps = {
  canEdit?: boolean;
  canDelete?: boolean;
  hideDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

function ActionCell({
  canEdit = true,
  canDelete = true,
  hideDelete = false,
  onEdit,
  onDelete,
}: ActionCellProps) {
  if (!canEdit && (!canDelete || hideDelete)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          aria-label="Open actions menu"
        >
          <IconDotsVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {/* {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <IconEdit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canEdit && canDelete && <DropdownMenuSeparator />} */}
        {canDelete && !hideDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <IconTrash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------- Add Devices Dialog Component ----------------
function AddDevicesDialog({
  group,
  open,
  onOpenChange,
}: AddDevicesDialogProps) {
  const [cameras, setCameras] = useState<Device[]>([]);
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

        const camerasData: Device[] = await camerasRes.json();
        const assignedData: Device[] = await assignedRes.json();

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
}

// ---------------- Role Badge Component ----------------
function RoleBadge({ role }: { role: string }) {
  const roleRaw = role.toLowerCase();
  const roleName = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);

  const getRoleIcon = () => {
    switch (roleRaw) {
      case "admin":
        return (
          <IconUser className="size-4 mr-1 text-red-500 dark:text-red-400" />
        );
      case "operator":
        return (
          <IconUserStar className="size-4 mr-1 text-blue-500 dark:text-blue-400" />
        );
      default:
        return (
          <IconUserPentagon className="size-4 mr-1 text-green-500 dark:text-gray-400" />
        );
    }
  };

  return (
    <Badge variant="outline" className="px-2 py-0.5 flex items-center gap-1">
      {getRoleIcon()}
      {roleName}
    </Badge>
  );
}

// ---------------- Status Badge Component ----------------
function StatusBadge({ status }: { status?: boolean }) {
  return status ? (
    <Badge variant="default">Online</Badge>
  ) : (
    <Badge variant="destructive">Offline</Badge>
  );
}

// ---------------- Date Cell Component ----------------
function DateCell({ date }: { date: string }) {
  const formattedDate = useMemo(() => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }, [date]);

  return <span>{formattedDate}</span>;
}

// ---------------- Reusable Components ----------------
function DraggableRow({ row }: { row: Row<any> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

function TableWrapper({
  table,
  columns,
  ids,
  sensors,
  onDragEnd,
}: {
  table: ReturnType<typeof useReactTable<any>>;
  columns: ColumnDef<any>[];
  ids: UniqueIdentifier[];
  sensors: any;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-lg border">
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={onDragEnd}
        sensors={sensors}
      >
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows?.length ? (
              <SortableContext
                items={ids}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((row) => (
                  <DraggableRow key={row.id} row={row} />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}

// ---------------- Add User Form Component ----------------
function AddUserForm({
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
}) {
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
}

// ---------------- Add Device Form Component ----------------
function AddDeviceForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
}) {
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
        <Button type="submit" disabled={loading || !canSubmit}>
          <Video />
          {loading ? "Adding..." : "Add Device"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------- Add Group Form Component ----------------
function AddGroupForm({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
}) {
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
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </div>
        )}
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
        <Button type="submit" disabled={loading || !canSubmit}>
          <Group />
          {loading ? "Adding..." : "Add Group"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------- Pagination Controls ----------------
function PaginationControls({
  table,
  idPrefix,
}: {
  table: ReturnType<typeof useReactTable<any>>;
  idPrefix: string;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const filteredRowCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {filteredRowCount} row(s).
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label
            htmlFor={`${idPrefix}-rows-per-page`}
            className="text-sm font-medium"
          >
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-20"
              id={`${idPrefix}-rows-per-page`}
            >
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronsLeft />
            <span className="sr-only">Go to first page</span>
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft />
            <span className="sr-only">Go to previous page</span>
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight />
            <span className="sr-only">Go to next page</span>
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronsRight />
            <span className="sr-only">Go to last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Main Component ----------------
export function DataTable({
  users: initUsers = [],
  devices: initDevices = [],
  groups: initGroups = [],
  hideUsersTable = false,
  refreshUsers,
  refreshDevices,
  refreshGroups,
}: {
  users?: User[];
  devices?: Device[];
  groups?: Group[];
  hideUsersTable?: boolean;
  refreshUsers?: () => Promise<void>;
  refreshDevices?: () => Promise<void>;
  refreshGroups?: () => Promise<void>;
}) {
  // State management
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabCounts, setTabCounts] = useState({
    users: 0,
    devices: 0,
    groups: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("");

  // Manage devices dialog state
  const [manageDevicesOpen, setManageDevicesOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Edit/Delete dialog states
  const [editUserDialog, setEditUserDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });

  const [editDeviceDialog, setEditDeviceDialog] = useState<{
    open: boolean;
    device: Device | null;
  }>({ open: false, device: null });

  const [editGroupDialog, setEditGroupDialog] = useState<{
    open: boolean;
    group: Group | null;
  }>({ open: false, group: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "user" | "device" | "group" | null;
    item: any;
    loading: boolean;
  }>({ open: false, type: null, item: null, loading: false });

  // Data states
  const [userData, setUserData] = useState<User[]>(initUsers);
  const [deviceData, setDeviceData] = useState<Device[]>(initDevices);
  const [groupData, setGroupData] = useState<Group[]>(initGroups);

  // Tab management
  const tabOptions = useMemo(
    () =>
      hideUsersTable ? ["devices", "groups"] : ["users", "devices", "groups"],
    [hideUsersTable]
  );

  const [activeTab, setActiveTab] = useState(tabOptions[0]);

  // Sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Effect to handle tab change when hideUsersTable changes
  useEffect(() => {
    if (hideUsersTable && activeTab === "users") {
      setActiveTab("devices");
    }
  }, [hideUsersTable, activeTab]);

  // Reset error and role when dialog closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setRole("");
    }
  }, [open]);

  // Sync state with props
  useEffect(() => {
    setUserData(initUsers);
  }, [initUsers]);

  useEffect(() => {
    setDeviceData(initDevices);
  }, [initDevices]);

  useEffect(() => {
    setGroupData(initGroups);
  }, [initGroups]);

  // API Handlers
  const updateUser = async (id: number, updatedData: Partial<User>) => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No access token found");

    const response = await fetch(`${API_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    return response.json();
  };

  const updateDevice = async (id: number, updatedData: Partial<Device>) => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No access token found");

    const response = await fetch(`${API_URL}/cameras/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update device");
    }

    return response.json();
  };

  const updateGroup = async (id: number, updatedData: Partial<Group>) => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No access token found");

    const response = await fetch(`${API_URL}/groups/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update group");
    }

    return response.json();
  };

  const deleteUser = async (id: number) => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No access token found");

    const response = await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete user");
    }
  };

  const deleteDevice = async (id: number) => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No access token found");

    const response = await fetch(`${API_URL}/cameras/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete device");
    }
  };

  const deleteGroup = async (id: number) => {
    const token = localStorage.getItem("accessToken");
    if (!token) throw new Error("No access token found");

    const response = await fetch(`${API_URL}/groups/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete group");
    }
  };

  // Edit Handlers
  const handleEditUser = useCallback(
    async (updatedData: Partial<User>) => {
      if (!editUserDialog.user) return;

      await updateUser(editUserDialog.user.id, updatedData);

      setUserData((prev) =>
        prev.map((user) =>
          user.id === editUserDialog.user!.id
            ? { ...user, ...updatedData }
            : user
        )
      );

      if (refreshUsers) {
        await refreshUsers();
      }
    },
    [editUserDialog.user, refreshUsers]
  );

  const handleEditDevice = useCallback(
    async (updatedData: Partial<Device>) => {
      if (!editDeviceDialog.device) return;

      await updateDevice(editDeviceDialog.device.id, updatedData);

      setDeviceData((prev) =>
        prev.map((device) =>
          device.id === editDeviceDialog.device!.id
            ? { ...device, ...updatedData }
            : device
        )
      );

      if (refreshDevices) {
        await refreshDevices();
      }
    },
    [editDeviceDialog.device, refreshDevices]
  );

  const handleEditGroup = useCallback(
    async (updatedData: Partial<Group>) => {
      if (!editGroupDialog.group) return;

      await updateGroup(editGroupDialog.group.id, updatedData);

      setGroupData((prev) =>
        prev.map((group) =>
          group.id === editGroupDialog.group!.id
            ? { ...group, ...updatedData }
            : group
        )
      );

      if (refreshGroups) {
        await refreshGroups();
      }
    },
    [editGroupDialog.group, refreshGroups]
  );

  // Delete Handler
  const handleDelete = useCallback(async () => {
    if (!deleteDialog.item || !deleteDialog.type) return;

    setDeleteDialog((prev) => ({ ...prev, loading: true }));

    try {
      switch (deleteDialog.type) {
        case "user":
          await deleteUser(deleteDialog.item.id);
          setUserData((prev) =>
            prev.filter((user) => user.id !== deleteDialog.item.id)
          );
          if (refreshUsers) await refreshUsers();
          toast.success("User deleted successfully");
          break;
        case "device":
          await deleteDevice(deleteDialog.item.id);
          setDeviceData((prev) =>
            prev.filter((device) => device.id !== deleteDialog.item.id)
          );
          if (refreshDevices) await refreshDevices();
          toast.success("Device deleted successfully");
          break;
        case "group":
          await deleteGroup(deleteDialog.item.id);
          setGroupData((prev) =>
            prev.filter((group) => group.id !== deleteDialog.item.id)
          );
          if (refreshGroups) await refreshGroups();
          toast.success("Group deleted successfully");
          break;
      }
      setDeleteDialog({ open: false, type: null, item: null, loading: false });
    } catch (err: any) {
      const errorMessage =
        err.message || `Failed to delete ${deleteDialog.type}`;
      toast.error(errorMessage);
      console.error(`Delete ${deleteDialog.type} error:`, err);
    } finally {
      setDeleteDialog((prev) => ({ ...prev, loading: false }));
    }
  }, [deleteDialog, refreshUsers, refreshDevices, refreshGroups]);

  // Memoized IDs for DnD
  const userIds = useMemo(() => userData.map((u) => u.id), [userData]);
  const deviceIds = useMemo(() => deviceData.map((d) => d.id), [deviceData]);
  const groupIds = useMemo(() => groupData.map((g) => g.id), [groupData]);

  // Columns
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => <DateCell date={row.original.created_at} />,
    },
    {
      accessorKey: "updated_at",
      header: "Updated At",
      cell: ({ row }) => <DateCell date={row.original.updated_at} />,
    },
    {
      id: "actions",
      header: () => null,
      size: 50,
      cell: ({ row }) => (
        <ActionCell
          canEdit
          canDelete
          onEdit={() => setEditUserDialog({ open: true, user: row.original })}
          onDelete={() =>
            setDeleteDialog({
              open: true,
              type: "user",
              item: row.original,
              loading: false,
            })
          }
        />
      ),
    },
  ];

  const deviceColumns: ColumnDef<Device>[] = [
    { accessorKey: "uid", header: "UID" },
    { accessorKey: "mac_address", header: "MAC Address" },
    { accessorKey: "ip_address", header: "IP Address" },
    { accessorKey: "firmware_version", header: "Firmware" },
    { accessorKey: "model", header: "Model" },
    { accessorKey: "manufacturer", header: "Manufacturer" },
    { accessorKey: "serial_number", header: "Serial Number" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => <StatusBadge status={getValue<boolean>()} />,
    },
    {
      accessorKey: "assigned_at",
      header: "Assigned At",
      cell: ({ row }) => <DateCell date={row.original.assigned_at} />,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <ActionCell
          canEdit
          canDelete
          onEdit={() =>
            setEditDeviceDialog({ open: true, device: row.original })
          }
          onDelete={() =>
            setDeleteDialog({
              open: true,
              type: "device",
              item: row.original,
              loading: false,
            })
          }
        />
      ),
      size: 50,
    },
  ];

  const groupColumns: ColumnDef<Group>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "description", header: "Description" },
    {
      id: "addDevices",
      header: "Devices",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedGroup(row.original);
            setManageDevicesOpen(true);
          }}
        >
          Manage Devices
        </Button>
      ),
      size: 120,
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ row }) => <DateCell date={row.original.created_at} />,
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <ActionCell
          canEdit
          canDelete
          onEdit={() => setEditGroupDialog({ open: true, group: row.original })}
          onDelete={() =>
            setDeleteDialog({
              open: true,
              type: "group",
              item: row.original,
              loading: false,
            })
          }
        />
      ),
      size: 50,
    },
  ];

  // Table instances
  const userTable = useReactTable({
    data: userData,
    columns: userColumns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const deviceTable = useReactTable({
    data: deviceData,
    columns: deviceColumns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const groupTable = useReactTable({
    data: groupData,
    columns: groupColumns,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Memoized tables map
  const tables = useMemo(
    () => ({
      users: userTable,
      devices: deviceTable,
      groups: groupTable,
    }),
    [userTable, deviceTable, groupTable]
  );

  const activeTable = tables[activeTab as keyof typeof tables];

  // Drag-and-drop handler
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active || !over || active.id === over.id) return;

      const activeId = Number(active.id);
      const overId = Number(over.id);

      switch (activeTab) {
        case "users":
          setUserData((data) => {
            const oldIndex = userIds.indexOf(activeId);
            const newIndex = userIds.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return data;
            return arrayMove(data, oldIndex, newIndex);
          });
          break;
        case "devices":
          setDeviceData((data) => {
            const oldIndex = deviceIds.indexOf(activeId);
            const newIndex = deviceIds.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return data;
            return arrayMove(data, oldIndex, newIndex);
          });
          break;
        case "groups":
          setGroupData((data) => {
            const oldIndex = groupIds.indexOf(activeId);
            const newIndex = groupIds.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return data;
            return arrayMove(data, oldIndex, newIndex);
          });
          break;
      }
    },
    [activeTab, userIds, deviceIds, groupIds]
  );

  // Add user handler
  const handleAddUser = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const formData = new FormData(e.currentTarget);
      const username = formData.get("username")?.toString();
      const password = formData.get("password")?.toString();
      const selectedRole = role.toLowerCase();

      if (!username || !password || !selectedRole) {
        toast.error("Please fill in all fields");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No access token found.");

        const res = await fetch(`${API_URL}/users`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password, role: selectedRole }),
        });

        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, use the HTTP status message
          }
          throw new Error(errorMessage);
        }

        setRole("");
        setError(null);
        setOpen(false);

        if (refreshUsers) {
          await refreshUsers();
        }

        toast.success("User added successfully");
      } catch (error: any) {
        console.error("Error adding user:", error);
        const errorMessage =
          error.message || "An error occurred while adding the user";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [role, refreshUsers]
  );

  // Add device handler
  const handleAddDevice = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const formData = new FormData(e.currentTarget);
      const uid = formData.get("uid")?.toString().trim();
      const mac_address = formData.get("mac_address")?.toString().trim();

      if (!uid && !mac_address) {
        toast.error(
          "Please provide at least one identifier (UID or MAC Address)"
        );
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No access token found.");

        const body = uid ? { uid } : { mac_address };

        const res = await fetch(`${API_URL}/cameras`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        setError(null);
        setOpen(false);

        if (refreshDevices) {
          await refreshDevices();
        }

        toast.success("Camera assigned successfully");
      } catch (error: any) {
        console.error("Error adding camera:", error);
        const errorMessage =
          error.message || "An error occurred while adding the camera";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [refreshDevices]
  );

  // Add group handler
  const handleAddGroup = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const formData = new FormData(e.currentTarget);
      const name = formData.get("name")?.toString();
      const description = formData.get("description")?.toString();

      if (!name || !description) {
        toast.error("Please fill in all fields");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No access token found.");

        const res = await fetch(`${API_URL}/groups`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, description }),
        });

        if (!res.ok) {
          let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, use the HTTP status message
          }
          throw new Error(errorMessage);
        }

        setError(null);
        setOpen(false);

        if (refreshGroups) {
          await refreshGroups();
        }

        toast.success("Group added successfully");
      } catch (error: any) {
        console.error("Error adding group:", error);
        const errorMessage =
          error.message || "An error occurred while adding the group";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [refreshGroups]
  );

  // Get visible columns for column visibility dropdown
  const getVisibleColumns = useCallback(
    (table: ReturnType<typeof useReactTable<any>>) => {
      return table.getAllColumns().filter((column) => {
        const hasAccessor = typeof column.accessorFn !== "undefined";
        const canHide = column.getCanHide();
        const isNotCoreColumn = ![
          "id",
          "description",
          "uid",
          "ip_address",
          "mac_address",
          "name",
          "username",
          "role",
        ].includes(column.id);

        return hasAccessor && canHide && isNotCoreColumn;
      });
    },
    []
  );

  useEffect(() => {
    setTabCounts({
      users: userTable.getFilteredRowModel().rows.length,
      devices: deviceTable.getFilteredRowModel().rows.length,
      groups: groupTable.getFilteredRowModel().rows.length,
    });
  }, [
    userTable.getFilteredRowModel().rows.length,
    deviceTable.getFilteredRowModel().rows.length,
    groupTable.getFilteredRowModel().rows.length,
  ]);

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-col justify-start gap-6"
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>

          {/* Mobile Select */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="view-selector"
            >
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              {tabOptions.map((tab) => (
                <SelectItem key={tab} value={tab}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Desktop Tabs */}
          <TabsList className="hidden @4xl/main:flex">
            {tabOptions.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <Badge variant="secondary" className="ml-2">
                  {tabCounts[tab as keyof typeof tabCounts] ?? 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Column Controls + Add Button */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns />
                  <span className="hidden lg:inline">Customize Columns</span>
                  <span className="lg:hidden">Columns</span>
                  <IconChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {getVisibleColumns(activeTable).map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconPlus />
                  <span className="hidden lg:inline">
                    Add{" "}
                    {activeTab === "users"
                      ? "User"
                      : activeTab === "devices"
                        ? "Device"
                        : "Group"}
                  </span>
                  <span className="lg:hidden">
                    {activeTab === "users"
                      ? "User"
                      : activeTab === "devices"
                        ? "Device"
                        : "Group"}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                {activeTab === "users" && (
                  <AddUserForm
                    onSubmit={handleAddUser}
                    loading={loading}
                    error={error}
                    role={role}
                    setRole={setRole}
                  />
                )}

                {activeTab === "devices" && (
                  <AddDeviceForm
                    onSubmit={handleAddDevice}
                    loading={loading}
                    error={error}
                  />
                )}

                {activeTab === "groups" && (
                  <AddGroupForm
                    onSubmit={handleAddGroup}
                    loading={loading}
                    error={error}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tab Content */}
        {tabOptions.map((tab) => {
          const currentTable = tables[tab as keyof typeof tables];
          const currentIds =
            tab === "users"
              ? userIds
              : tab === "devices"
                ? deviceIds
                : groupIds;
          const currentColumns =
            tab === "users"
              ? userColumns
              : tab === "devices"
                ? deviceColumns
                : groupColumns;

          return (
            <TabsContent
              key={tab}
              value={tab}
              className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
            >
              <TableWrapper
                table={currentTable}
                columns={currentColumns}
                ids={currentIds}
                sensors={sensors}
                onDragEnd={handleDragEnd}
              />
              <PaginationControls table={currentTable} idPrefix={tab} />
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Single Manage Devices Dialog */}
      <AddDevicesDialog
        group={selectedGroup}
        open={manageDevicesOpen}
        onOpenChange={(open) => {
          setManageDevicesOpen(open);
          if (!open) setSelectedGroup(null);
        }}
      />

      {/* Edit Dialogs */}
      <EditUserDialog
        user={editUserDialog.user}
        open={editUserDialog.open}
        onOpenChange={(open) => setEditUserDialog({ open, user: null })}
        onSave={handleEditUser}
      />

      <EditDeviceDialog
        device={editDeviceDialog.device}
        open={editDeviceDialog.open}
        onOpenChange={(open) => setEditDeviceDialog({ open, device: null })}
        onSave={handleEditDevice}
      />

      <EditGroupDialog
        group={editGroupDialog.group}
        open={editGroupDialog.open}
        onOpenChange={(open) => setEditGroupDialog({ open, group: null })}
        onSave={handleEditGroup}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        openChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleDelete}
        loading={deleteDialog.loading}
        title={`Delete ${deleteDialog.type?.charAt(0).toUpperCase()}${deleteDialog.type?.slice(1) || ""}`}
        description={`Are you sure you want to delete this ${deleteDialog.type}? This action cannot be undone.`}
      />
    </>
  );
}
