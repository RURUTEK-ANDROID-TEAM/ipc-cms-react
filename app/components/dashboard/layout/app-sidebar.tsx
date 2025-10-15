import {
  IconFileAi,
  IconFileDescription,
  IconTimelineEventPlus,
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
import { Activity, useEffect, useState, type ComponentProps } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme-provider";
import { NavLink, useNavigate } from "react-router";
import type { DecodedToken } from "@/lib/utils";
import { SessionTimeoutDialog } from "@/components/auth/dialogs/session-timout-dialog";
import {
  Camera,
  CarFront,
  Cog,
  Group,
  LayoutDashboard,
  ListVideo,
  MessageCircleQuestionMark,
  PersonStanding,
  ScanFace,
  SlidersVertical,
  ThermometerSun,
  Timer,
  Users,
  Video,
} from "lucide-react";

const API_URL = "http://172.16.0.157:5000/api";

type UserRole = "admin" | "operator" | "viewer" | null;

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Live View",
      url: "/dashboard/live-view",
      icon: Video,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Groups",
      url: "/dashboard/groups",
      icon: Group,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Playback",
      url: "/dashboard/playback",
      icon: ListVideo,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      title: "Management",
      url: "/dashboard/management",
      icon: SlidersVertical,
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
      icon: Camera,
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
      url: "/dashboard/settings",
      icon: Cog,
      roles: ["admin"] as UserRole[],
    },
    {
      title: "Get Help",
      url: "#",
      icon: MessageCircleQuestionMark,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
  ],
  documents: [
    {
      name: "Faces",
      url: "#",
      icon: ScanFace,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "Heat Maps",
      url: "#",
      icon: ThermometerSun,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "People",
      url: "#",
      icon: PersonStanding,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "Visitors",
      url: "#",
      icon: Users,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "ANPR",
      url: "#",
      icon: CarFront,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
    {
      name: "Timelapse",
      url: "#",
      icon: Timer,
      roles: ["admin", "operator", "viewer"] as UserRole[],
    },
  ],
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const [userData, setUserData] = useState({
    name: "",
    role: "",
    avatar: "",
  });

  const [userRole, setUserRole] = useState<UserRole>(null);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);

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

        if (!token) {
          setShowSessionTimeout(true);
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        };

        const profileResponse = await axios.post<{
          username: string;
          roles: string[];
        }>(`${API_URL}/auth/profile`, {}, { headers });

        const username = profileResponse.data.username;
        const role = profileResponse.data.roles[0] as UserRole;

        setUserData({
          name: username,
          role: role || "",
          avatar: "",
        });

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
    <>
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
                <NavLink to="/dashboard">
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
                </NavLink>
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
          <NavUser user={userData} />
        </SidebarFooter>
      </Sidebar>
      <Activity mode={showSessionTimeout ? "visible" : "hidden"}>
        <SessionTimeoutDialog
          open={showSessionTimeout}
          onClose={() => setShowSessionTimeout(false)}
        />
      </Activity>
    </>
  );
}
