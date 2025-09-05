import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import type { FC } from "react";

interface StatusBadgeProps {
  status?: boolean;
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status = false }) => {
  return (
    <Badge
      variant="outline" // Use an outline variant for a cleaner look
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors
        ${
          status
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300"
            : "bg-destructive/10 text-destructive dark:bg-red-900/20 dark:text-red-300"
        }
      `}
    >
      {status ? (
        <CheckCircle2Icon className="size-3.5" />
      ) : (
        <XCircleIcon className="size-3.5" />
      )}
      <span>{status ? "Online" : "Offline"}</span>
    </Badge>
  );
};
