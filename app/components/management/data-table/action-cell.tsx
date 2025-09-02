import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

type ActionCellProps = {
  canEdit?: boolean;
  canDelete?: boolean;
  hideDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export const ActionCell = ({
  canEdit = true,
  canDelete = true,
  hideDelete = false,
  onEdit,
  onDelete,
}: ActionCellProps) => {
  if (!canEdit && (!canDelete || hideDelete)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
          aria-label="Open actions menu"
        >
          <IconDotsVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {/* {canEdit && (
          <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
            <IconEdit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canEdit && canDelete && <DropdownMenuSeparator />} */}
        {canDelete && !hideDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <IconTrash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
