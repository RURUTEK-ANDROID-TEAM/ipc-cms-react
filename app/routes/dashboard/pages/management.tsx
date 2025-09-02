import { DataTable } from "@/components/management/data-table/data-table";
import {
  useEffect,
  useRef,
  useState,
  type FC,
  type JSX,
  type ReactNode,
} from "react";
import { useOutletContext } from "react-router";

type OutletHeaderSetter = {
  setHeader?: (ctx: { title?: string; actions?: ReactNode | null }) => void;
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
  const updateOnlineUIDs = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [onlineUIDs, setOnlineUIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = "http://172.16.0.157:5000/api";
  const WS_URL = "ws://172.16.0.157:5001/camdata";

  useEffect(() => {
    return () => {
      if (hideUsersTable) {
        outlet?.setHeader?.({ title: "Dashboard", actions: null });
      } else {
        outlet?.setHeader?.({ title: "Management", actions: null });
      }
    };
  }, [hideUsersTable]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No access token found");

        const headers = { Authorization: `Bearer ${token}` };
        const fetchPromises = [
          fetch(`${API_URL}/cameras`, { headers }),
          fetch(`${API_URL}/groups`, { headers }),
        ];

        if (!hideUsersTable) {
          fetchPromises.unshift(fetch(`${API_URL}/users`, { headers }));
        }

        const responses = await Promise.all(fetchPromises);
        const data = await Promise.all(responses.map((r) => r.json()));

        if (!hideUsersTable) {
          setUsers(data[0]);
          setDevices(data[1]);
          setGroups(data[2]);
        } else {
          setUsers([]);
          setDevices(data[0]);
          setGroups(data[1]);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setUsers([]);
        setDevices([]);
        setGroups([]);
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
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  async function fetchUsers() {
    const token = localStorage.getItem("accessToken");
    const res = await fetch("http://172.16.0.157:5000/api/users", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(await res.json());
  }

  async function fetchDevices() {
    const token = localStorage.getItem("accessToken");
    const res = await fetch("http://172.16.0.157:5000/api/cameras", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDevices(await res.json());
  }

  async function fetchGroups() {
    const token = localStorage.getItem("accessToken");
    const res = await fetch("http://172.16.0.157:5000/api/groups", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setGroups(await res.json());
  }

  return (
    <DataTable
      users={users}
      devices={devices}
      groups={groups}
      refreshUsers={fetchUsers}
      refreshDevices={fetchDevices}
      refreshGroups={fetchGroups}
      hideUsersTable={hideUsersTable}
      onUpdate={onUpdate}
    />
  );
};

export default Management;
