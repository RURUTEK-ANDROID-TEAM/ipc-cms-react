import { DataTable } from "@/components/dashboard/data-table";
import { useEffect, useState, type FC, type JSX } from "react";

interface ManagementProps {
  hideUsersTable?: boolean;
}

const Management: FC<ManagementProps> = ({
  hideUsersTable = false,
}): JSX.Element => {
  const [users, setUsers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [onlineUIDs, setOnlineUIDs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = "http://172.16.0.157:5000/api";
  const WS_URL = "ws://172.16.0.157:5001/camdata";

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

    fetchData();
  }, [hideUsersTable]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "camera_status") {
          setOnlineUIDs(msg.online || []);
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

  console.log("Hide Users Table: ", hideUsersTable);

  return (
    <DataTable
      users={users}
      devices={devices}
      groups={groups}
      hideUsersTable={hideUsersTable}
    />
  );
};

export default Management;
