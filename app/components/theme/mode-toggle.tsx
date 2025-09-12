import { useTheme } from "../../hooks/use-theme-provider";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SunIcon } from "../ui/sun";
import { MoonIcon } from "../ui/moon";
import { useRef } from "react";
import type { IconHandle } from "../ui/user";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  // Refs to control the icons
  const sunRef = useRef<IconHandle>(null);
  const moonRef = useRef<IconHandle>(null);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {theme === "light" && <SunIcon ref={sunRef} className="mr-2 h-4 w-4" />}
        {theme === "dark" && (
          <MoonIcon ref={moonRef} className="mr-2 h-4 w-4" />
        )}
        <span>Theme</span>
      </DropdownMenuSubTrigger>

      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            onClick={() => {
              setTheme("light");
              sunRef.current?.startAnimation();
            }}
            onMouseEnter={() => sunRef.current?.startAnimation()}
            onMouseLeave={() => sunRef.current?.stopAnimation()}
          >
            <SunIcon ref={sunRef} className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setTheme("dark");
              moonRef.current?.startAnimation();
            }}
            onMouseEnter={() => moonRef.current?.startAnimation()}
            onMouseLeave={() => moonRef.current?.stopAnimation()}
          >
            <MoonIcon ref={moonRef} className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
