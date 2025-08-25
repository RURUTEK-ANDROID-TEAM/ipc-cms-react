import { DataTable } from "@/components/dashboard/data-table";
import { useEffect, useState } from "react";
import data from "./data.json";

const Management = () => {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        const res = await fetch("http://172.16.0.157:5000/api/users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }

        const users = await res.json();
        setUsers(users);
      } catch (error) {
        console.error(error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        const res = await fetch("http://172.16.0.157:5000/api/cameras", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }

        const cameras = await res.json();
        setDevices(cameras);
      } catch (error) {
        console.error(error);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  return loading ? (
    <div className="flex items-center justify-center h-[80vh]">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : null}
    </div>
  ) : (
    <DataTable users={users} devices={devices} />
  );
};

export default Management;
