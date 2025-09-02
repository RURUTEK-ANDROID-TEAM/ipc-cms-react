import { IconUser, IconUserPentagon, IconUserStar } from "@tabler/icons-react";
import { Badge } from "../../ui/badge";

export const RoleBadge = ({ role }: { role: string }) => {
  const roleRaw = role.toLowerCase();
  const roleName = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);

  const getRoleIcon = () => {
    switch (roleRaw) {
      case "admin":
        return (
          <IconUser className="size-4 mr-1 text-red-500 dark:text-red-400" />
        );
      case "operator":
        return (
          <IconUserStar className="size-4 mr-1 text-blue-500 dark:text-blue-400" />
        );
      default:
        return (
          <IconUserPentagon className="size-4 mr-1 text-green-500 dark:text-gray-400" />
        );
    }
  };

  return (
    <Badge variant="outline" className="px-2 py-0.5 flex items-center gap-1">
      {getRoleIcon()}
      {roleName}
    </Badge>
  );
};
