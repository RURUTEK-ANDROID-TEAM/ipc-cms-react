import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import {
  IconChevronDown,
  IconLayoutColumns,
  IconPlus,
} from "@tabler/icons-react";

import {
  type ColumnDef,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "../dialogs/delete-confirmation-dialog";
import type { DeviceType, GroupType, UserType } from "../schemas/schemas";
import { EditUserDialog } from "../dialogs/edit-user-dialog";
import { EditDeviceDialog } from "../dialogs/edit-device-dialog";
import { ActionCell } from "./action-cell";
import { EditGroupDialog } from "../dialogs/edit-group-dialog";
import { AddDevicesDialog } from "../dialogs/add-devices-dialog";
import { RoleBadge } from "../badges/role-badge";
import { StatusBadge } from "../badges/status-badge";
import { DateCell } from "./data-cell";
import { AddUserForm } from "../forms/add-user-form";
import { AddDeviceForm } from "../forms/add-device-form";
import { TableWrapper } from "./table-wrapper";
import { AddGroupForm } from "../forms/add-group-form";
import { PaginationControls } from "./pagination-controls";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@/lib/utils";
import { useNavigate } from "react-router";
import { SessionTimeoutDialog } from "@/components/auth/dialogs/session-timout-dialog";
import { Activity } from "react";

const API_URL = "http://172.16.0.157:5000/api";

// ---------------- Main Component ----------------
export const DataTable = ({
  users: initUsers = [],
  devices: initDevices = [],
  groups: initGroups = [],
  hideUsersTable = false,
  showAddUsers = false,
  showAddDevices = false,
  showAddGroups = false,
  refreshUsers,
  refreshDevices,
  refreshGroups,
  onUpdate,
}: {
  users?: UserType[];
  devices?: DeviceType[];
  groups?: GroupType[];
  hideUsersTable?: boolean;
  showAddUsers?: boolean;
  showAddDevices?: boolean;
  showAddGroups?: boolean;
  refreshUsers?: () => Promise<void>;
  refreshDevices?: () => Promise<void>;
  refreshGroups?: () => Promise<void>;
  onUpdate?: () => void;
}) => {
  const navigate = useNavigate();

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
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);

  // Edit/Delete dialog states
  const [editUserDialog, setEditUserDialog] = useState<{
    open: boolean;
    user: UserType | null;
  }>({ open: false, user: null });

  const [editDeviceDialog, setEditDeviceDialog] = useState<{
    open: boolean;
    device: DeviceType | null;
  }>({ open: false, device: null });

  const [editGroupDialog, setEditGroupDialog] = useState<{
    open: boolean;
    group: GroupType | null;
  }>({ open: false, group: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "user" | "device" | "group" | null;
    item: any;
    loading: boolean;
  }>({ open: false, type: null, item: null, loading: false });

  // Data states
  const [userData, setUserData] = useState<UserType[]>(initUsers);
  const [deviceData, setDeviceData] = useState<DeviceType[]>(initDevices);
  const [groupData, setGroupData] = useState<GroupType[]>(initGroups);

  const [showSessionTimeout, setShowSessionTimeout] = useState(false);

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
  const updateUser = async (id: number, updatedData: Partial<UserType>) => {
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

    try {
      const res = await axios.put(
        `${API_URL}/users/${id}`,
        updatedData, // 👈 this is the request body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      return res.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle known axios error
        console.error("API Error:", error.response?.data || error.message);

        throw new Error(
          error.response?.data?.message ||
            `Failed to update user: ${error.response?.status}`
        );
      } else {
        // Handle unknown error
        console.error("Unexpected Error:", error);
        throw new Error("Unexpected error while updating user");
      }
    }
  };

  const updateDevice = async (id: number, updatedData: Partial<DeviceType>) => {
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

    try {
      const res = await axios.put(
        `${API_URL}/cameras/${id}`,
        updatedData, // 👈 this is the request body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      return res.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle known axios error
        console.error("API Error:", error.response?.data || error.message);

        throw new Error(
          error.response?.data?.message ||
            `Failed to update device: ${error.response?.status}`
        );
      } else {
        // Handle unknown error
        console.error("Unexpected Error:", error);
        throw new Error("Unexpected error while updating user");
      }
    }
  };

  const updateGroup = async (id: number, updatedData: Partial<GroupType>) => {
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

    try {
      const res = await axios.put(
        `${API_URL}/groups/${id}`,
        updatedData, // 👈 this is the request body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      return res.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // Handle known axios error
        console.error("API Error:", error.response?.data || error.message);

        throw new Error(
          error.response?.data?.message ||
            `Failed to update group: ${error.response?.status}`
        );
      } else {
        // Handle unknown error
        console.error("Unexpected Error:", error);
        throw new Error("Unexpected error while updating user");
      }
    }
  };

  const deleteUser = async (id: number) => {
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

    try {
      const res = await axios.delete(`${API_URL}/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      return res.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // Handle known axios error
        console.error("API Error:", error.response?.data || error.message);

        throw new Error(
          error.response?.data?.message ||
            `Failed to delete user: ${error.response?.status}`
        );
      } else {
        // Handle unknown error
        console.error("Unexpected Error:", error);
        throw new Error("Unexpected error while deleting user");
      }
    }
  };

  const deleteDevice = async (id: number) => {
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

    try {
      const res = await axios.delete(`${API_URL}/cameras/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      return res.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("API Error:", error.response?.data || error.message);
        throw new Error(
          error.response?.data?.message ||
            `Failed to delete device: ${error.response?.status}`
        );
      } else {
        console.error("Unexpected Error:", error);
        throw new Error("Unexpected error while deleting device");
      }
    }
  };

  const deleteGroup = async (id: number) => {
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

    try {
      const res = await axios.delete(`${API_URL}/groups/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      return res.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("API Error:", error.response?.data || error.message);
        throw new Error(
          error.response?.data?.message ||
            `Failed to delete group: ${error.response?.status}`
        );
      } else {
        console.error("Unexpected Error:", error);
        throw new Error("Unexpected error while deleting group");
      }
    }
  };

  // Edit Handlers
  const handleEditUser = useCallback(
    async (updatedData: Partial<UserType>) => {
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
    async (updatedData: Partial<DeviceType>) => {
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
    async (updatedData: Partial<GroupType>) => {
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
          onUpdate?.();
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
  const userColumns: ColumnDef<UserType>[] = [
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
        <Activity mode={row.original.role !== "admin" ? "visible" : "hidden"}>
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
        </Activity>
      ),
    },
  ];

  const deviceColumns: ColumnDef<DeviceType>[] = [
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

  const groupColumns: ColumnDef<GroupType>[] = [
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

        const res = await axios.post(
          `${API_URL}/users`,
          { username, password, role: selectedRole },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );

        // Reset form state
        setRole("");
        setError(null);
        setOpen(false);

        if (refreshUsers) {
          await refreshUsers();
        }

        toast.success("User added successfully");
        return res.data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.data || error.message);
          const errorMessage =
            error.response?.data?.message ||
            `Failed to add user: ${error.response?.status}`;
          setError(errorMessage);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } else {
          console.error("Unexpected Error:", error);
          const errorMessage = "Unexpected error while adding user";
          setError(errorMessage);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [role, refreshUsers]
  );

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

        const body = uid ? { uid } : { mac_address };

        const res = await axios.post(`${API_URL}/cameras`, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        });

        // Reset state
        setError(null);
        setOpen(false);

        if (refreshDevices) {
          await refreshDevices();
          onUpdate?.();
        }

        toast.success("Camera assigned successfully");
        return res.data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.data || error.message);
          const errorMessage =
            error.response?.data?.message ||
            `Failed to add device: ${error.response?.status}`;
          setError(errorMessage);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } else {
          console.error("Unexpected Error:", error);
          const errorMessage = "Unexpected error while adding camera";
          setError(errorMessage);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [refreshDevices, onUpdate]
  );

  // Add group handler
  const handleAddGroup = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      const formData = new FormData(e.currentTarget);
      const name = formData.get("name")?.toString().trim();
      const description = formData.get("description")?.toString().trim();

      if (!name || !description) {
        toast.error("Please fill in all fields");
        setLoading(false);
        return;
      }

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

        const res = await axios.post(
          `${API_URL}/groups`,
          { name, description },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );

        // Reset state
        setError(null);
        setOpen(false);

        if (refreshGroups) {
          await refreshGroups();
        }

        toast.success("Group added successfully");
        return res.data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.data || error.message);
          const errorMessage =
            error.response?.data?.message ||
            `Failed to add group: ${error.response?.status}`;
          setError(errorMessage);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        } else {
          console.error("Unexpected Error:", error);
          const errorMessage = "Unexpected error while adding group";
          setError(errorMessage);
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
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
      <Activity mode={showSessionTimeout ? "visible" : "hidden"}>
        <SessionTimeoutDialog
          open={showSessionTimeout}
          onClose={() => setShowSessionTimeout(false)}
        />
      </Activity>
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
                {(activeTab === "users" && showAddUsers) ||
                (activeTab === "devices" && showAddDevices) ||
                (activeTab === "groups" && showAddGroups) ? (
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
                ) : null}
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <Activity mode={activeTab === "users" ? "visible" : "hidden"}>
                  <AddUserForm
                    onSubmit={handleAddUser}
                    loading={loading}
                    error={error}
                    role={role}
                    setRole={setRole}
                  />
                </Activity>
                <Activity mode={activeTab === "devices" ? "visible" : "hidden"}>
                  <AddDeviceForm
                    onSubmit={handleAddDevice}
                    loading={loading}
                    error={error}
                  />
                </Activity>
                <Activity mode={activeTab === "groups" ? "visible" : "hidden"}>
                  <AddGroupForm
                    onSubmit={handleAddGroup}
                    loading={loading}
                    error={error}
                  />
                </Activity>
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
};
