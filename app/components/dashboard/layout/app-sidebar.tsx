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
  type Icon as TablerIcon,
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
import { useEffect, useState, type ComponentProps } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme-provider";
import { useNavigate } from "react-router";
import type { DecodedToken } from "@/lib/utils";

const API_URL = "http://172.16.0.157:5000/api";

type UserRole = "admin" | "operator" | "viewer" | null;

// Navigation item interfaces with role-based visibility
interface NavItem {
  title: string;
  url: string;
  icon: TablerIcon;
  roles?: UserRole[];
}

interface DocumentItem {
  name: string;
  url: string;
  icon: TablerIcon;
  roles?: UserRole[];
}

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
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Live View",
      url: "/dashboard/live-view",
      icon: IconVideo,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Groups",
      url: "/dashboard/groups",
      icon: IconCardsFilled,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Playback",
      url: "/dashboard/playback",
      icon: IconArrowBackUp,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Management",
      url: "/dashboard/management",
      icon: IconAdjustments,
      roles: ["admin"] as UserRole[],
    },
    {
      title: "Events",
      url: "#",
      icon: IconTimelineEventPlus,
      roles: ["admin", "operator"] as UserRole[],
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
      roles: ["admin"] as UserRole[],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
      roles: ["admin"] as UserRole[],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
      roles: ["admin"] as UserRole[],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
      roles: ["admin"] as UserRole[],
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
  ],
  documents: [
    {
      name: "Faces",
      url: "#",
      icon: IconFaceId,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "Heat Maps",
      url: "#",
      icon: IconTemperatureSun,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "People",
      url: "#",
      icon: IconUsers,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "Visitors",
      url: "#",
      icon: IconUsers,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "ANPR",
      url: "#",
      icon: IconCar,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "Timelapse",
      url: "#",
      icon: IconCalendarClock,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
  ],
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        if (token) {
          const decoded = jwtDecode<DecodedToken>(token);
          if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            localStorage.removeItem("accessToken");
            navigate("/");
            return;
          }
        }

        if (!token) throw new Error("No access token found");

        const headers = {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        };
        const profileResponse = await axios.post<{ roles: string[] }>(
          `${API_URL}/auth/profile`,
          {},
          { headers }
        );
        const role = profileResponse.data.roles[0] as UserRole;

        setUserRole(role);
      } catch (err: any) {
        console.error(`Profile fetch error: ${err}`);
        toast.error("Failed to fetch profile data. Using default permissions.");
        setUserRole("viewer"); // Fallback to viewer role
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Filter items based on user role
  const filterByRole = <T extends { roles?: UserRole[] }>(
    items: T[],
    role: UserRole
  ): T[] => {
    if (!role) return [];
    return items.filter((item) => !item.roles || item.roles.includes(role));
  };

  const filteredNavMain = filterByRole(data.navMain, userRole);
  const filteredDocuments = filterByRole(data.documents, userRole);
  const filteredNavSecondary = filterByRole(data.navSecondary, userRole);

  if (isLoading) {
    return null; // Or a loading spinner
  }

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
                  src={
                    theme === "dark"
                      ? "/rurutek_logo_dark.png"
                      : "/rurutek_logo.png"
                  }
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

      {/* Scrollable middle content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <SidebarContent className="px-0">
            <NavMain items={filteredNavMain} />
            <NavAIFeatures items={filteredDocuments} />
            <NavSecondary items={filteredNavSecondary} className="mt-auto" />
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
