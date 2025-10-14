import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Activity } from "react";
import { Link, NavLink } from "react-router";

export function NavAIFeatures({
  items,
}: {
  items: {
    name: string;
    url: string;
    icon: any;
  }[];
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>AI Features</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = location.pathname === item.url;

          return (
            <Tooltip key={item.name} delayDuration={200}>
              <TooltipTrigger asChild>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
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
                        {item.name}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                  {/* <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction
                      showOnHover
                      className="data-[state=open]:bg-accent rounded-sm"
                    >
                      <IconDots />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-24 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuItem>
                      <IconFolder />
                      <span>Open</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <IconShare3 />
                      <span>Share</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <IconTrash />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> */}
                </SidebarMenuItem>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="rounded-md px-2 py-1 text-sm text-popover-foreground border-border"
              >
                {item.name}
              </TooltipContent>
            </Tooltip>
          );
        })}
        {/* <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <IconDots className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem> */}
      </SidebarMenu>
    </SidebarGroup>
  );
}
