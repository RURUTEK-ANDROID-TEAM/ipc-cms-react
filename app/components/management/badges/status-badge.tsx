import { Badge } from "../../ui/badge";

type StatusBadgeProps = {
  status?: boolean;
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <Badge variant={status ? "default" : "destructive"}>
      {status ? "Online" : "Offline"}
    </Badge>
  );
};
