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
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { DialogClose, DialogTrigger } from "@radix-ui/react-dialog";
import { Input } from "../ui/input";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

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

// ---------------- Columns ----------------
const userColumns: ColumnDef<z.infer<typeof userSchema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  { accessorKey: "id", header: "ID" },
  { accessorKey: "username", header: "Username" },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const roleRaw = row.original.role.toLowerCase();
      const role = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);
      const icon =
        roleRaw === "admin" ? (
          <IconUser className="size-4 mr-1 text-red-500 dark:text-red-400" />
        ) : roleRaw === "operator" ? (
          <IconUserStar className="size-4 mr-1 text-blue-500 dark:text-blue-400" />
        ) : (
          <IconUserPentagon className="size-4 mr-1 text-green-500 dark:text-gray-400" />
        );
      return (
        <Badge
          variant="outline"
          className="px-2 py-0.5 flex items-center gap-1"
        >
          {icon}
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    cell: ({ row }) => {
      const date = new Date(row.original.updated_at);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    },
  },

  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          >
            <IconDotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const deviceColumns: ColumnDef<z.infer<typeof deviceSchema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  { accessorKey: "id", header: "ID" },
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
    cell: ({ getValue }) => {
      const online = getValue<boolean>();
      return online ? (
        <Badge variant={"default"}>Online</Badge>
      ) : (
        <Badge variant={"destructive"}>Offline</Badge>
      );
    },
  },
  {
    accessorKey: "assigned_at",
    header: "Assigned At",
    cell: ({ row }) => new Date(row.original.assigned_at).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconDotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

const groupColumns: ColumnDef<z.infer<typeof groupSchema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "description", header: "Description" },

  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          >
            <IconDotsVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
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
  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {table.getFilteredRowModel().rows.length} row(s).
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
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="w-20"
              id={`${idPrefix}-rows-per-page`}
            >
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronsRight />
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
            {table.getRowModel().rows?.length ? (
              <SortableContext
                items={ids}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row) => (
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

// ---------------- Main ----------------
export function DataTable({
  users: initUsers,
  devices: initDevices,
  groups: initGroups,
  hideUsersTable = false,
}: {
  users: z.infer<typeof userSchema>[];
  devices: z.infer<typeof deviceSchema>[];
  groups: z.infer<typeof groupSchema>[];
  hideUsersTable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username")?.toString();
    const password = formData.get("password")?.toString();
    const selectedRole = role ? role.toLowerCase() : null;

    if (!username || !password || !selectedRole) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("No access token found. Please log in.");
        setLoading(false);
        return;
      }

      const res = await fetch("http://172.16.0.157:5000/api/users", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Something went wrong while adding the user"
        );
      }

      // ✅ Show toast first
      toast.success("User added successfully 🎉");

      // ✅ Update table
      setUserData((prev) => [
        ...prev,
        {
          id: data.id,
          username: data.username,
          role: data.role,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        },
      ]);

      // ✅ Reset form and role
      setRole("");
      e.currentTarget.reset();

      // ✅ Close the dialog AFTER state updates
      setOpen(false);
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  // states
  const [userData, setUserData] = useState(
    Array.isArray(initUsers) ? initUsers : []
  );
  const [deviceData, setDeviceData] = useState(initDevices);
  const [groupData, setGroupData] = useState(initGroups);

  // active tab
  const tabOptions = hideUsersTable
    ? ["devices", "groups"]
    : ["users", "devices", "groups"];

  const [activeTab, setActiveTab] = useState(tabOptions[0]);

  const [role, setRole] = useState("");

  useEffect(() => {
    if (hideUsersTable && activeTab === "users") {
      setActiveTab("devices");
    }
  }, [hideUsersTable, activeTab]);

  // sync state with props
  useEffect(() => setUserData(initUsers), [initUsers]);
  useEffect(() => setDeviceData(initDevices), [initDevices]);
  useEffect(() => setGroupData(initGroups), [initGroups]);

  // ids for dnd
  const userIds = useMemo(
    () => (Array.isArray(userData) ? userData.map(({ id }) => id) : []),
    [userData]
  );

  const deviceIds = useMemo(
    () => (Array.isArray(deviceData) ? deviceData.map(({ id }) => id) : []),
    [deviceData]
  );

  const groupIds = useMemo(
    () => (Array.isArray(groupData) ? groupData.map(({ id }) => id) : []),
    [groupData]
  );

  // table instances
  const userTable = useReactTable({
    data: userData,
    columns: userColumns,
    state: {},
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const deviceTable = useReactTable({
    data: deviceData,
    columns: deviceColumns,
    state: {},
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const groupTable = useReactTable({
    data: groupData,
    columns: groupColumns,
    state: {},
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // drag-and-drop handler
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    if (activeTab === "users") {
      setUserData((data) => {
        const oldIndex = userIds.indexOf(Number(active.id));
        const newIndex = userIds.indexOf(Number(over.id));
        if (oldIndex === -1 || newIndex === -1) return data;
        return arrayMove(data, oldIndex, newIndex);
      });
    } else if (activeTab === "devices") {
      setDeviceData((data) => {
        const oldIndex = deviceIds.indexOf(Number(active.id));
        const newIndex = deviceIds.indexOf(Number(over.id));
        if (oldIndex === -1 || newIndex === -1) return data;
        return arrayMove(data, oldIndex, newIndex);
      });
    } else if (activeTab === "groups") {
      setGroupData((data) => {
        const oldIndex = groupIds.indexOf(Number(active.id));
        const newIndex = groupIds.indexOf(Number(over.id));
        if (oldIndex === -1 || newIndex === -1) return data;
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  // map tab → table
  const tables: Record<string, any> = {
    users: userTable,
    devices: deviceTable,
    groups: groupTable,
  };

  const activeTable = tables[activeTab];

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
              {tab === "users" && (
                <Badge variant="secondary">
                  {tables.users.getFilteredRowModel().rows.length}
                </Badge>
              )}
              {tab === "devices" && (
                <Badge variant="secondary">
                  {tables.devices.getFilteredRowModel().rows.length}
                </Badge>
              )}
              {tab === "groups" && (
                <Badge variant="secondary">
                  {tables.groups.getFilteredRowModel().rows.length}
                </Badge>
              )}
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
              {activeTable
                .getAllColumns()
                .filter(
                  (c: ReturnType<typeof activeTable.getAllColumns>[number]) =>
                    typeof c.accessorFn !== "undefined" &&
                    c.getCanHide() &&
                    ![
                      "id",
                      "description",
                      "uid",
                      "ip_address",
                      "mac_address",
                      "name",
                      "username",
                      "role",
                    ].includes(c.id)
                )
                .map(
                  (
                    column: ReturnType<typeof activeTable.getAllColumns>[number]
                  ) => (
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
                  )
                )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <IconPlus />
                <span className="hidden lg:inline">
                  {activeTab === "users" && "Add User"}
                  {activeTab === "devices" && "Add Device"}
                  {activeTab === "groups" && "Add Group"}
                </span>
                <span className="lg:hidden">
                  {activeTab === "users" && "User"}
                  {activeTab === "devices" && "Device"}
                  {activeTab === "groups" && "Group"}
                </span>
              </Button>
            </DialogTrigger>
            {activeTab === "users" && (
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleAddUser}>
                  <DialogHeader className="mb-4">
                    <DialogTitle>Add User</DialogTitle>
                    <DialogDescription>
                      Fill in the details below to create a new user account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div className="grid gap-3">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        required
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="role">Role</Label>
                      <Select value={role} onValueChange={setRole} required>
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
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={loading}>
                      <UserPlus /> Add User
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            )}
            {activeTab === "devices" && (
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Device</DialogTitle>
                  <DialogDescription>
                    Make changes to your profile here. Click save when
                    you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="name-1">Name</Label>
                    <Input
                      id="name-1"
                      name="name"
                      defaultValue="Pedro Duarte"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="username-1">Username</Label>
                    <Input
                      id="username-1"
                      name="username"
                      defaultValue="@peduarte"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </DialogContent>
            )}
            {activeTab === "groups" && (
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Groups</DialogTitle>
                  <DialogDescription>
                    Make changes to your profile here. Click save when
                    you&apos;re done.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="name-1">Name</Label>
                    <Input
                      id="name-1"
                      name="name"
                      defaultValue="Pedro Duarte"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="username-1">Username</Label>
                    <Input
                      id="username-1"
                      name="username"
                      defaultValue="@peduarte"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </div>
      </div>

      {/* Tab Content */}
      {tabOptions.map((tab) => (
        <TabsContent
          key={tab}
          value={tab}
          className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
        >
          <TableWrapper
            table={tables[tab]}
            columns={
              tab === "users"
                ? userColumns
                : tab === "devices"
                  ? deviceColumns
                  : groupColumns
            }
            ids={
              tab === "users"
                ? userIds
                : tab === "devices"
                  ? deviceIds
                  : groupIds
            }
            sensors={sensors}
            onDragEnd={handleDragEnd}
          />
          <PaginationControls table={tables[tab]} idPrefix={tab} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
