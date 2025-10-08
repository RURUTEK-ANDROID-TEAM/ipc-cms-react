import { SessionTimeoutDialog } from "@/components/auth/session-timout-dialog";
import { DataTable } from "@/components/management/data-table/data-table";
import type {
  DeviceType,
  GroupType,
  UserType,
} from "@/components/management/schemas/schemas";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { DecodedToken } from "@/lib/utils";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type JSX,
  type ReactNode,
} from "react";
import { useNavigate, useOutletContext } from "react-router";
import { toast } from "sonner";

const API_URL = "http://172.16.0.157:5000/api";
const WS_URL = "ws://172.16.0.157:5001/camdata";

type OutletHeaderSetter = {
  setHeader?: (ctx: {
    title?: string;
    actions?: ReactNode | null;
    breadcrumb?: { title: string; path: string }[];
  }) => void;
};

interface ManagementProps {
  hideUsersTable?: boolean;
  onUpdate?: () => void;
}

const Management: FC<ManagementProps> = ({
  hideUsersTable = false,
  onUpdate,
}): JSX.Element => {
  const outlet = useOutletContext<OutletHeaderSetter>();
  const navigate = useNavigate();
  const updateOnlineUIDs = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [onlineUIDs, setOnlineUIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddUsers, setShowAddUsers] = useState(true);
  const [showAddDevices, setShowAddDevices] = useState(true);
  const [showAddGroups, setShowAddGroups] = useState(true);

  const [showSessionTimeout, setShowSessionTimeout] = useState(false);

  useEffect(() => {
    return () => {
      if (hideUsersTable) {
        outlet?.setHeader?.({
          title: "Dashboard",
          actions: null,
          breadcrumb: [],
        });
      } else {
        outlet?.setHeader?.({
          title: "Management",
          actions: null,
          breadcrumb: [
            { title: "Dashboard", path: "/dashboard" },
            { title: "Management", path: "dashboard/management" },
          ],
        });
      }
    };
  }, [hideUsersTable]);

  useEffect(() => {
    const fetchProfile = async () => {
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

        const headers = {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        };
        const profileResponse = await axios.post<{ roles: string[] }>(
          `${API_URL}/auth/profile`,
          {},
          { headers }
        );
        const userRole = profileResponse.data.roles[0];

        // Set add permissions based on role
        setShowAddUsers(userRole === "admin");
        setShowAddDevices(userRole === "admin" || userRole === "operator");
        setShowAddGroups(userRole === "admin" || userRole === "operator");
      } catch (err: any) {
        console.error(`Profile fetch error: ${err}`);
        setShowAddUsers(false);
        setShowAddDevices(false);
        setShowAddGroups(false);
        toast.error(`Failed to fetch profile data`);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
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

        const headers = {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        };

        // Build requests dynamically
        const requests = hideUsersTable
          ? [
              axios.get<DeviceType[]>(`${API_URL}/cameras`, { headers }),
              axios.get<GroupType[]>(`${API_URL}/groups`, { headers }),
            ]
          : [
              axios.get<UserType[]>(`${API_URL}/users`, { headers }),
              axios.get<DeviceType[]>(`${API_URL}/cameras`, { headers }),
              axios.get<GroupType[]>(`${API_URL}/groups`, { headers }),
            ];

        const responses = await Promise.all(requests);

        if (!hideUsersTable) {
          setUsers(responses[0].data);
          setDevices(responses[1].data);
          setGroups(responses[2].data);
        } else {
          setUsers([]);
          setDevices(responses[0].data);
          setGroups(responses[1].data);
        }
      } catch (err: any) {
        console.error("❌ Fetch error:", err);
        setUsers([]);
        setDevices([]);
        setGroups([]);

        const errorMessage =
          err.response?.data?.message || err.message || "Failed to fetch data";
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    console.log("Hide Users Table: ", hideUsersTable);
    fetchData();
  }, [hideUsersTable]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "camera_status") {
          if (updateOnlineUIDs.current) clearTimeout(updateOnlineUIDs.current);
          updateOnlineUIDs.current = setTimeout(() => {
            setOnlineUIDs(msg.online || []);
          }, 50);
        }
      } catch (err) {
        console.error("WebSocket message parse error:", err);
      }
    };

    ws.onopen = () => console.log("Camera WebSocket connected");
    ws.onclose = () => console.log("Camera WebSocket disconnected");

    return () => ws.close();
  }, []);

  useEffect(() => {
    setDevices((prev) =>
      prev.map((device) => ({
        ...device,
        status: onlineUIDs.includes(device.uid),
      }))
    );
  }, [onlineUIDs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-2xl font-bold">
        <Empty className="w-full h-full items-center">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner />
            </EmptyMedia>
            <EmptyTitle>Processing your request</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  async function fetchUsers() {
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

      const res = await axios.get(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  async function fetchDevices() {
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

      const res = await axios.get(`${API_URL}/cameras`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      setDevices(res.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  }

  async function fetchGroups() {
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

      const res = await axios.get(`${API_URL}/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });
      setGroups(res.data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }

  return (
    <>
      {showSessionTimeout && (
        <SessionTimeoutDialog
          open={showSessionTimeout}
          onClose={() => setShowSessionTimeout(false)}
        />
      )}
      <DataTable
        users={users}
        devices={devices}
        groups={groups}
        refreshUsers={fetchUsers}
        refreshDevices={fetchDevices}
        refreshGroups={fetchGroups}
        hideUsersTable={hideUsersTable}
        showAddUsers={showAddUsers}
        showAddDevices={showAddDevices}
        showAddGroups={showAddGroups}
        onUpdate={onUpdate}
      />
    </>
  );
};

export default Management;
