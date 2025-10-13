import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "../../hooks/use-theme-provider";
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Activity } from "react";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Activity mode={theme === "light" ? "visible" : "hidden"}>
          <Sun className="mr-2 h-4 w-4" />
        </Activity>
        <Activity mode={theme === "dark" ? "visible" : "hidden"}>
          <Moon className="mr-2 h-4 w-4" />
        </Activity>
        <span>Theme</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
