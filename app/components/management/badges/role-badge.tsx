import { Badge } from "@/components/ui/badge"; // shadcn/ui Badge
import {
  AdminUserIcon,
  OperatorUserIcon,
  ViewerUserIcon,
  type IconHandle,
} from "@/components/ui/icons/user";
import { useRef } from "react";

interface RoleConfig {
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<{ className?: string }> &
      React.RefAttributes<IconHandle>
  >;
  color: string;
}

interface RoleBadgeProps {
  role: string;
}

const roleConfig: Record<string, RoleConfig> = {
  admin: {
    icon: AdminUserIcon,
    color: "bg-red-500 hover:bg-red-600",
  },
  operator: {
    icon: OperatorUserIcon,
    color: "bg-blue-500 hover:bg-blue-600",
  },
  default: {
    icon: ViewerUserIcon,
    color: "bg-gray-500 hover:bg-gray-600",
  },
};

export const RoleBadge = ({ role }: RoleBadgeProps) => {
  const roleRaw = role.toLowerCase();
  const roleName = roleRaw.charAt(0).toUpperCase() + roleRaw.slice(1);
  const { icon: Icon, color } = roleConfig[roleRaw] || roleConfig.default;

  // 👇 hook into the animation API from UserIcon
  const iconRef = useRef<IconHandle>(null);

  return (
    <Badge
      variant="secondary"
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium 
        text-white ${color} transition-colors
      `}
    >
      <Icon ref={iconRef} className="size-3.5" />
      {roleName}
    </Badge>
  );
};
