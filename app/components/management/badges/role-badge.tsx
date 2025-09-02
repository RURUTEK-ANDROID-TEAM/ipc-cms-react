import { IconUser, IconUserPentagon, IconUserStar } from "@tabler/icons-react";
import { Badge } from "../../ui/badge";

interface RoleBadgeProps {
  role: string;
}

interface RoleConfig {
  icon: React.ComponentType<{ className: string }>;
  color: string;
}

const roleConfig: Record<string, RoleConfig> = {
  admin: { icon: IconUser, color: "text-red-500 dark:text-red-400" },
  operator: { icon: IconUserStar, color: "text-blue-500 dark:text-blue-400" },
  default: {
    icon: IconUserPentagon,
    color: "text-green-500 dark:text-gray-400",
  },
};

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const roleRaw = role.toLowerCase();
  const roleName = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);
  const { icon: Icon, color } = roleConfig[roleRaw] || roleConfig.default;

  return (
    <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5">
      <Icon className={`size-4 mr-1 ${color}`} />
      {roleName}
    </Badge>
  );
};
