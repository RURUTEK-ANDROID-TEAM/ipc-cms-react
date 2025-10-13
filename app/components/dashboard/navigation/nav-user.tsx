import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { useNavigate } from "react-router";
import {
  BellRing,
  CircleUser,
  CreditCard,
  EllipsisVertical,
  LogOut,
} from "lucide-react";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

interface UserInfoProps {
  name: string;
  email: string;
  avatar: string;
  className?: string;
}

const UserInfo = ({ name, email, avatar, className }: UserInfoProps) => (
  <div className={`flex items-center gap-2 text-left text-sm ${className}`}>
    <Avatar className="h-8 w-8 rounded-lg">
      <AvatarImage src={avatar} alt={name} />
      <AvatarFallback className="rounded-lg">
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="grid flex-1 leading-tight">
      <span className="truncate font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{email}</span>
    </div>
  </div>
);

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserInfo
                name={user.name}
                email={user.email}
                avatar={user.avatar}
                className="grayscale"
              />
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* User header */}
            <DropdownMenuLabel className="p-0 font-normal">
              <UserInfo
                name={user.name}
                email={user.email}
                avatar={user.avatar}
                className="px-1 py-1.5"
              />
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Main group */}
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellRing />
                Notifications
              </DropdownMenuItem>

              <ModeToggle />
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Log out */}
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem("accessToken");
                navigate("/");
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
