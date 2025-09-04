import {
  IconAdjustments,
  IconArrowBackUp,
  IconCalendarClock,
  IconCamera,
  IconCar,
  IconCardsFilled,
  IconDashboard,
  IconFaceId,
  IconFileAi,
  IconFileDescription,
  IconHelp,
  IconSettings,
  IconTemperatureSun,
  IconTimelineEventPlus,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../ui/sidebar";
import { NavMain } from "../navigation/nav-main";
import { NavSecondary } from "../navigation/nav-secondary";
import { NavUser } from "../navigation/nav-user";
import { NavAIFeatures } from "../navigation/nav-ai-features";
import { ScrollArea } from "@/components/ui/scroll-area";

const data = {
  user: {
    name: "admin",
    email: "admin@example.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Live View",
      url: "/dashboard/live-view",
      icon: IconVideo,
    },
    {
      title: "Groups",
      url: "/dashboard/groups",
      icon: IconCardsFilled,
    },
    {
      title: "Playback",
      url: "/dashboard/playback",
      icon: IconArrowBackUp,
    },
    {
      title: "Management",
      url: "/dashboard/management",
      icon: IconAdjustments,
    },
    {
      title: "Events",
      url: "#",
      icon: IconTimelineEventPlus,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
  documents: [
    {
      name: "Faces",
      url: "#",
      icon: IconFaceId,
    },
    {
      name: "Heat Maps",
      url: "#",
      icon: IconTemperatureSun,
    },
    {
      name: "People",
      url: "#",
      icon: IconUsers,
    },
    {
      name: "Visitors",
      url: "#",
      icon: IconUsers,
    },
    {
      name: "ANPR",
      url: "#",
      icon: IconCar,
    },
    {
      name: "Timelapse",
      url: "#",
      icon: IconCalendarClock,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="h-screen flex flex-col"
    >
      {/* Fixed header */}
      <SidebarHeader className="flex-shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <a href="/dashboard">
                <img
                  src="/rurutek_logo.png"
                  alt="Rurutek Logo"
                  className="w-8 h-auto mb-2 mt-2"
                />
                <span className="text-base font-semibold">
                  Ruru Tek Private Limited
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Scrollable middle content - this is the key fix */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <SidebarContent className="px-0">
            <NavMain items={data.navMain} />
            <NavAIFeatures items={data.documents} />
            <NavSecondary items={data.navSecondary} className="mt-auto" />
          </SidebarContent>
        </ScrollArea>
      </div>

      {/* Fixed footer */}
      <SidebarFooter className="flex-shrink-0">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
