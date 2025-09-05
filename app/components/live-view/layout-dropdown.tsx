import { GalleryHorizontalEnd, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarMenuButton } from "../ui/sidebar";

interface LayoutDropdownProps {
  viewLayout: "2x2" | "3x3" | "4x4";
  setViewLayout: (layout: "2x2" | "3x3" | "4x4") => void;
}

export function LayoutDropdown({
  viewLayout,
  setViewLayout,
}: LayoutDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <GalleryHorizontalEnd className="size-4 dark:text-white" />
          </div>
          <div className="flex gap-1 leading-none">
            <span className="font-medium">Layout</span>
            <span>{viewLayout}</span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width]"
        align="start"
      >
        {(["2x2", "3x3", "4x4"] as const).map((layout) => (
          <DropdownMenuItem key={layout} onSelect={() => setViewLayout(layout)}>
            {layout}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
