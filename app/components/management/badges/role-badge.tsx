import { IconUser, IconUserPentagon, IconUserStar } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge"; // Using shadcn/ui Badge
import type { ComponentType } from "react";

// Define the shape of a role configuration
interface RoleConfig {
  icon: ComponentType<{ className?: string }>;
  color: string;
}

// Define the props for the RoleBadge component
interface RoleBadgeProps {
  role: string;
}

// Map roles to specific icons and Tailwind CSS classes for color
const roleConfig: Record<string, RoleConfig> = {
  admin: {
    icon: IconUserPentagon,
    color: "bg-red-500 hover:bg-red-600",
  },
  operator: {
    icon: IconUser,
    color: "bg-blue-500 hover:bg-blue-600",
  },
  default: {
    icon: IconUserStar,
    color: "bg-gray-500 hover:bg-gray-600",
  },
};

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const roleRaw = role.toLowerCase();
  const roleName = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);
  const { icon: Icon, color } = roleConfig[roleRaw] || roleConfig.default;

  return (
    <Badge
      variant="secondary"
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium 
        text-white ${color} transition-colors
      `}
    >
      <Icon className="size-3.5" />
      {roleName}
    </Badge>
  );
};
