import { Activity, useCallback, useState, type FormEvent } from "react";
import { AddGroupForm } from "@/components/management/forms/add-group-form";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Group } from "lucide-react";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@/lib/utils";
import { useNavigate } from "react-router";
import axios from "axios";
import { SessionTimeoutDialog } from "../auth/dialogs/session-timout-dialog";

const API_URL = "http://172.16.0.157:5000/api";

export const CreateGroupDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);

  const handleAddGroup = useCallback(async (e: FormEvent<HTMLFormElement>) => {
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

      toast.success("Group added successfully");
      window.location.reload();

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
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="dark:text-white">
            <Group /> Create Group
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <AddGroupForm
            onSubmit={handleAddGroup}
            loading={loading}
            error={error}
          />
        </DialogContent>
      </Dialog>
      <Activity mode={showSessionTimeout ? "visible" : "hidden"}>
        <SessionTimeoutDialog
          open={showSessionTimeout}
          onClose={() => setShowSessionTimeout(false)}
        />
      </Activity>
    </>
  );
};
