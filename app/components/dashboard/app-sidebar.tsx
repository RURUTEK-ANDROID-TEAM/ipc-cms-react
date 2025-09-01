import {
  IconAdjustments,
  IconAi,
  IconArrowBackUp,
  IconCalendarClock,
  IconCamera,
  IconCar,
  IconDashboard,
  IconDatabase,
  IconFaceId,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconHelp,
  IconReport,
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
} from "../ui/sidebar";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import { NavDocuments } from "./nav-documents";

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
      url: "",
      icon: IconTimelineEventPlus,
    },
    // {
    //   title: "AI Features",
    //   url: "",
    //   icon: IconAi,
    // },
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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <a href="#">
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
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
