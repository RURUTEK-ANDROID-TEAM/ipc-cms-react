import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Activity, type ReactNode } from "react";
import { Link } from "react-router";

type BreadcrumbItem = {
  title: string;
  path: string;
};

type Props = {
  title?: string;
  actions?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
};

export function SiteHeader({
  title = "",
  actions = null,
  breadcrumb = [],
}: Props) {
  const isBreadcrumbEmpty = breadcrumb.length === 0;

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* --- Render the Breadcrumb using shadcn/ui components --- */}
        {isBreadcrumbEmpty ? (
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        ) : (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumb.map((item, index) => {
                const isLastItem = index === breadcrumb.length - 1;
                return (
                  <div key={item.path} className="flex items-center gap-2">
                    <BreadcrumbItem>
                      {isLastItem ? (
                        <BreadcrumbPage>{item.title}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={item.path}>{item.title}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    <Activity mode={!isLastItem ? "visible" : "hidden"}>
                      <BreadcrumbSeparator />
                    </Activity>
                  </div>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
