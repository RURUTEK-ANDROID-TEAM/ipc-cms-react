import * as React from "react";
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
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ChartConfig } from "@/components/ui/chart";
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
  SelectItem,
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

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  });

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

const userColumns: ColumnDef<z.infer<typeof userSchema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="w-32">{row.original.id}</div>,
    enableHiding: false,
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => <div className="w-32">{row.original.username}</div>,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const roleRaw = row.original.role.toLowerCase();
      const role = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);

      let color: "destructive" | "secondary" | "default" = "default";

      switch (roleRaw) {
        case "admin":
          color = "destructive"; // red-ish
          break;
        case "operator":
          color = "secondary"; // blue-ish
          break;
        case "viewer":
          color = "default"; // gray
          break;
      }

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
    header: () => (
      <div className="w-full text-right font-medium ">Created At</div>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created_at);
      return (
        <div className="w-full text-right text-sm text-gray-700 dark:text-gray-300">
          {date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
        </div>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: () => (
      <div className="w-full text-right font-medium">Updated At</div>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.updated_at);
      return (
        <div className="w-full text-right text-sm text-gray-700 dark:text-gray-300">
          {date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
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
  { accessorKey: "id", header: "ID", cell: ({ row }) => row.original.id },
  { accessorKey: "uid", header: "UID", cell: ({ row }) => row.original.uid },
  {
    accessorKey: "mac_address",
    header: "MAC Address",
    cell: ({ row }) => row.original.mac_address,
  },
  {
    accessorKey: "ip_address",
    header: "IP Address",
    cell: ({ row }) => row.original.ip_address,
  },
  {
    accessorKey: "firmware_version",
    header: "Firmware",
    cell: ({ row }) => row.original.firmware_version,
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ row }) => row.original.model,
  },
  {
    accessorKey: "manufacturer",
    header: "Manufacturer",
    cell: ({ row }) => row.original.manufacturer,
  },
  {
    accessorKey: "serial_number",
    header: "Serial Number",
    cell: ({ row }) => row.original.serial_number,
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

function DraggableRow({ row }: { row: Row<any> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({
  users: initUsers,
  devices: initDevices,
}: {
  users: z.infer<typeof userSchema>[];
  devices: z.infer<typeof deviceSchema>[];
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const [userData, setUserData] = React.useState(() => initUsers);
  const [userRowSelection, setUserRowSelection] = React.useState({});
  const [userColumnVisibility, setUserColumnVisibility] =
    React.useState<VisibilityState>({});
  const [userColumnFilters, setUserColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [userSorting, setUserSorting] = React.useState<SortingState>([]);
  const [userPagination, setUserPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [deviceData, setDeviceData] = React.useState(() => initDevices);
  const [deviceRowSelection, setDeviceRowSelection] = React.useState({});
  const [deviceColumnVisibility, setDeviceColumnVisibility] =
    React.useState<VisibilityState>({});
  const [deviceColumnFilters, setDeviceColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [deviceSorting, setDeviceSorting] = React.useState<SortingState>([]);
  const [devicePagination, setDevicePagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Sync props to state
  React.useEffect(() => setUserData(initUsers), [initUsers]);
  React.useEffect(() => setDeviceData(initDevices), [initDevices]);

  const userIds = React.useMemo<UniqueIdentifier[]>(
    () => userData?.map(({ id }) => id) || [],
    [userData]
  );

  const userTable = useReactTable({
    data: userData,
    columns: userColumns,
    state: {
      sorting: userSorting,
      columnVisibility: userColumnVisibility,
      rowSelection: userRowSelection,
      columnFilters: userColumnFilters,
      pagination: userPagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setUserRowSelection,
    onSortingChange: setUserSorting,
    onColumnFiltersChange: setUserColumnFilters,
    onColumnVisibilityChange: setUserColumnVisibility,
    onPaginationChange: setUserPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const deviceIds = React.useMemo<UniqueIdentifier[]>(
    () => deviceData.map((d) => d.id),
    [deviceData]
  );
  const deviceTable = useReactTable({
    data: deviceData,
    columns: deviceColumns,
    state: {
      sorting: deviceSorting,
      columnVisibility: deviceColumnVisibility,
      rowSelection: deviceRowSelection,
      columnFilters: deviceColumnFilters,
      pagination: devicePagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setDeviceRowSelection,
    onSortingChange: setDeviceSorting,
    onColumnFiltersChange: setDeviceColumnFilters,
    onColumnVisibilityChange: setDeviceColumnVisibility,
    onPaginationChange: setDevicePagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setUserData((data) => {
        const oldIndex = userIds.indexOf(active.id);
        const newIndex = userIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  return (
    <Tabs defaultValue="users" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="users">
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="view-selector"
          >
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="users">Users</SelectItem>
            <SelectItem value="devices">Devices</SelectItem>
            <SelectItem value="groups">Groups</SelectItem>
            {/* <SelectItem value="focus-documents">Focus Documents</SelectItem> */}
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="devices">
            Devices <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="groups">
            Groups <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          {/* <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger> */}
        </TabsList>
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
              {userTable
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide() &&
                    !["username", "role"].includes(column.id) // exclude these
                )
                .map((column) => {
                  const label = column.id
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <IconPlus />
            <span className="hidden lg:inline">Add Section</span>
          </Button>
        </div>
      </div>
      <TabsContent
        value="users"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {userTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {userTable.getRowModel().rows?.length ? (
                  <SortableContext
                    items={userIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {userTable.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={userColumns.length}
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
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {/* {userTable.getFilteredSelectedRowModel().rows.length} of{" "} */}
            {userTable.getFilteredRowModel().rows.length} row(s).
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${userTable.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  userTable.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={userTable.getState().pagination.pageSize}
                  />
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
              Page {userTable.getState().pagination.pageIndex + 1} of{" "}
              {userTable.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => userTable.setPageIndex(0)}
                disabled={!userTable.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => userTable.previousPage()}
                disabled={!userTable.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => userTable.nextPage()}
                disabled={!userTable.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() =>
                  userTable.setPageIndex(userTable.getPageCount() - 1)
                }
                disabled={!userTable.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="devices"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {deviceTable.getHeaderGroups().map((headerGroup) => (
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
                {deviceTable.getRowModel().rows?.length ? (
                  <SortableContext
                    items={deviceIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {deviceTable.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={deviceColumns.length}
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

        {/* Pagination and rows-per-page controls */}
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {deviceTable.getFilteredRowModel().rows.length} row(s).
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label
                htmlFor="device-rows-per-page"
                className="text-sm font-medium"
              >
                Rows per page
              </Label>
              <Select
                value={`${deviceTable.getState().pagination.pageSize}`}
                onValueChange={(value) =>
                  deviceTable.setPageSize(Number(value))
                }
              >
                <SelectTrigger
                  size="sm"
                  className="w-20"
                  id="device-rows-per-page"
                >
                  <SelectValue
                    placeholder={deviceTable.getState().pagination.pageSize}
                  />
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
              Page {deviceTable.getState().pagination.pageIndex + 1} of{" "}
              {deviceTable.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => deviceTable.setPageIndex(0)}
                disabled={!deviceTable.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => deviceTable.previousPage()}
                disabled={!deviceTable.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => deviceTable.nextPage()}
                disabled={!deviceTable.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() =>
                  deviceTable.setPageIndex(deviceTable.getPageCount() - 1)
                }
                disabled={!deviceTable.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="groups" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent
        value="focus-documents"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig;
