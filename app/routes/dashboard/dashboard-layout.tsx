import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SiteHeader } from "@/components/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { CSSProperties, ReactNode } from "react";
import { Outlet } from "react-router";
import { useState } from "react";

type HeaderContext = {
  title?: string;
  actions?: ReactNode | null;
};

const DashboardLayout = () => {
  // Parent-managed header state (default = "Dashboard")
  const [header, setHeader] = useState<HeaderContext>({
    title: "Dashboard",
    actions: null,
  });

  // Expose a setter that merges partial updates (convenience)
  const setHeaderSafe = (ctx: HeaderContext) =>
    setHeader((prev) => ({ ...prev, ...ctx }));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        {/* SiteHeader reads the parent-managed header state */}
        <SiteHeader title={header.title} actions={header.actions} />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Provide the setter to all child routes via Outlet context */}
              <Outlet context={{ setHeader: setHeaderSafe }} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
