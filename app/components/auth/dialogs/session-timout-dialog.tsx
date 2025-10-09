import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SessionTimeoutDialogProps {
  open: boolean;
  onClose?: () => void;
  redirectAfter?: number; // seconds
}

export const SessionTimeoutDialog: React.FC<SessionTimeoutDialogProps> = ({
  open,
  onClose,
  redirectAfter = 5,
}) => {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(redirectAfter);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      navigate("/"); // redirect to login
      onClose?.();
    }, redirectAfter * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [open, navigate, onClose, redirectAfter]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Session Timed Out</DialogTitle>
          <DialogDescription>
            Your session has expired. Redirecting to login in {secondsLeft}{" "}
            seconds...
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant={"outline"}
            onClick={() => {
              navigate("/");
              onClose?.();
            }}
          >
            Go to Login Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
