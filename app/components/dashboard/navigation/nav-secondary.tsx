import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavLink } from "react-router";
import { Activity, type ComponentPropsWithoutRef } from "react";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: any;
  }[];
} & ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
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
                    <Activity mode={item.icon ? "visible" : "hidden"}>
                      <item.icon
                        className={`size-4 ${
                          isActive ? "text-blue-500" : "text-gray-500"
                        } dark:${isActive ? "text-blue-400" : "text-white"}`}
                      />
                    </Activity>
                    <span
                      className={`${
                        isActive ? "text-blue-500" : "text-gray-700"
                      } dark:${isActive ? "text-blue-400" : "text-white"}`}
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
