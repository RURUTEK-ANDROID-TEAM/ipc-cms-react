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
import { Link } from "react-router";

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
        {items.map((item) => (
          <Tooltip key={item.name} delayDuration={200}>
            <TooltipTrigger asChild>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.name}</span>
                  </Link>
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
        ))}
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
