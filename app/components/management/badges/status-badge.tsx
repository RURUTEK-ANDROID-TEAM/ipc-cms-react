import { Badge } from "../../ui/badge";

export const StatusBadge = ({ status }: { status?: boolean }) => {
  return status ? (
    <Badge variant="default">Online</Badge>
  ) : (
    <Badge variant="destructive">Offline</Badge>
  );
};
