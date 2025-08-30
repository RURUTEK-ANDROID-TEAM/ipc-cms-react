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
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
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
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Group, UserPlus, Video } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "../ui/checkbox";

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

// ---------------- Drag Handle ----------------
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

// ---------------- Action Cell Component ----------------
function ActionCell() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
        >
          <IconDotsVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------- FIXED Add Devices Dialog Component ----------------
function AddDevicesDialog({ group }: { group: Group }) {
  const [open, setOpen] = useState(false);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("accessToken");

        const camerasRes = await fetch("http://172.16.0.157:5000/api/cameras", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const assignedRes = await fetch(
          `http://172.16.0.157:5000/api/groups/${group.id}/devices`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!camerasRes.ok || !assignedRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const camerasData = await camerasRes.json();
        const assignedData = await assignedRes.json();

        setCameras(camerasData);
        // Extract camera_id from the assigned devices response
        setSelectedDevices(new Set(assignedData.map((d: any) => d.camera_id)));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load cameras");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, group.id]);

  const toggleDevice = (id: number) => {
    const copy = new Set(selectedDevices);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setSelectedDevices(copy);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");

      // First, remove all existing devices from the group
      const currentlyAssigned = cameras.map((c) => c.id);
      if (currentlyAssigned.length > 0) {
        await fetch(`http://172.16.0.157:5000/api/groups/${group.id}/devices`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cameraIds: currentlyAssigned,
          }),
        });
      }

      // Then add the selected devices if any are selected
      if (selectedDevices.size > 0) {
        const response = await fetch(
          `http://172.16.0.157:5000/api/groups/${group.id}/devices`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cameraIds: Array.from(selectedDevices) }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update devices");
        }
      }

      toast.success("Devices updated successfully");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update devices"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Devices
        </Button>
      </DialogTrigger>
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
                  key={cam.id}
                  className="flex items-center gap-3 border-b py-3"
                >
                  <Checkbox
                    checked={selectedDevices.has(cam.id)}
                    onCheckedChange={() => toggleDevice(cam.id)}
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
                    {cam.uid && (
                      <div className="text-xs text-muted-foreground">
                        Model: {cam.model || "N/A"} • IP:{" "}
                        {cam.ip_address || "N/A"}
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
            onClick={() => setOpen(false)}
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

// ---------------- Columns ----------------
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
    cell: () => <ActionCell />,
    size: 50,
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
    cell: () => <ActionCell />,
    size: 50,
  },
];

const groupColumns: ColumnDef<Group>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "description", header: "Description" },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => <DateCell date={row.original.created_at} />,
  },
  {
    id: "addDevices",
    header: "Devices",
    cell: ({ row }) => <AddDevicesDialog group={row.original} />,
    size: 120,
  },
  {
    id: "actions",
    header: () => null,
    cell: () => <ActionCell />,
    size: 50,
  },
];

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
            className="hidden size-8 lg:flex"
            size="icon"
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

  // Reset form when not loading and no error
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

  // Reset form when not loading and no error
  useEffect(() => {
    if (!loading && !error && formRef.current) {
      formRef.current.reset();
      setMacAddress("");
      setUid("");
    }
  }, [loading, error]);

  // Check if at least one identifier is filled
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

  // Reset form when not loading and no error
  useEffect(() => {
    if (!loading && !error && formRef.current) {
      formRef.current.reset();
      setName("");
      setDescription("");
    }
  }, [loading, error]);

  // Both fields are required for groups
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

  // Sync state with props (only on mount)
  useEffect(() => {
    setUserData(initUsers);
  }, [initUsers]);

  useEffect(() => {
    setDeviceData(initDevices);
  }, [initDevices]);

  useEffect(() => {
    setGroupData(initGroups);
  }, [initGroups]);

  // Memoized IDs for DnD
  const userIds = useMemo(() => userData.map((u) => u.id), [userData]);
  const deviceIds = useMemo(() => deviceData.map((d) => d.id), [deviceData]);
  const groupIds = useMemo(() => groupData.map((g) => g.id), [groupData]);

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

        const res = await fetch("http://172.16.0.157:5000/api/users", {
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

        const res = await fetch("http://172.16.0.157:5000/api/cameras", {
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

        const res = await fetch("http://172.16.0.157:5000/api/groups", {
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
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
          tab === "users" ? userIds : tab === "devices" ? deviceIds : groupIds;
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
  );
}
