import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router";

interface NavItem {
  title: string;
  url: string;
  icon: any;
}

interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={isActive ? "active" : ""}
                  isActive={isActive}
                  color={isActive ? "primary" : "default"}
                >
                  <NavLink
                    to={item.url}
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`
                    }
                  >
                    {item.icon && (
                      <item.icon
                        className={`size-4 ${isActive ? "text-blue-500" : "text-gray-500"} dark:${isActive ? "text-blue-400" : "text-white"}`}
                      />
                    )}
                    <span
                      className={`${isActive ? "text-blue-500" : "text-gray-700"} dark:${isActive ? "text-blue-400" : "text-white"}`}
                    >
                      {item.title}
                    </span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
