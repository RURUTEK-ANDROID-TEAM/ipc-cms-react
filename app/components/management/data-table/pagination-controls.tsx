import type { useReactTable } from "@tanstack/react-table";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Button } from "../../ui/button";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";

// Memoize the page size options to prevent unnecessary re-renders
const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

export const PaginationControls = ({
  table,
  idPrefix,
}: {
  table: ReturnType<typeof useReactTable<any>>;
  idPrefix: string;
}) => {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const rowsPerPageId = `${idPrefix}-rows-per-page`;

  // Navigation button configuration to reduce duplication
  const navigationButtons = [
    {
      key: "first",
      icon: <IconChevronsLeft />,
      onClick: () => table.setPageIndex(0),
      disabled: !table.getCanPreviousPage(),
      className: "hidden h-8 w-8 p-0 lg:flex",
      label: "Go to first page",
    },
    {
      key: "previous",
      icon: <IconChevronLeft />,
      onClick: () => table.previousPage(),
      disabled: !table.getCanPreviousPage(),
      className: "size-8",
      label: "Go to previous page",
    },
    {
      key: "next",
      icon: <IconChevronRight />,
      onClick: () => table.nextPage(),
      disabled: !table.getCanNextPage(),
      className: "size-8",
      label: "Go to next page",
    },
    {
      key: "last",
      icon: <IconChevronsRight />,
      onClick: () => table.setPageIndex(pageCount - 1),
      disabled: !table.getCanNextPage(),
      className: "hidden h-8 w-8 p-0 lg:flex",
      label: "Go to last page",
    },
  ];

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {filteredRowCount} row{filteredRowCount !== 1 ? "s" : ""}.
      </div>
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-between lg:w-fit lg:gap-8">
        <div className="flex items-center gap-2 order-2 sm:order-1">
          <Label
            htmlFor={rowsPerPageId}
            className="text-sm font-medium hidden lg:block"
          >
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="w-20" id={rowsPerPageId}>
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 order-1 sm:order-2">
          <div className="text-sm font-medium">
            Page {pageIndex + 1} of {pageCount}
          </div>
          <div className="flex items-center gap-1">
            {navigationButtons.map((button) => (
              <Button
                key={button.key}
                variant="outline"
                size="icon"
                className={button.className}
                onClick={button.onClick}
                disabled={button.disabled}
                aria-label={button.label}
              >
                {button.icon}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
