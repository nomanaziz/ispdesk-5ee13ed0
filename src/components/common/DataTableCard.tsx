import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Settings2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/hooks/useColumnVisibility";

interface DataTableCardProps {
  title?: string;
  /** Optional count badge next to the title */
  count?: number | string;
  /** Right-side actions placed before the columns toggle */
  actions?: ReactNode;
  /** Column visibility controls — pass straight from useColumnVisibility */
  columns?: ColumnDef[];
  isVisible?: (key: string) => boolean;
  toggle?: (key: string) => void;
  reset?: () => void;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Reusable card wrapper for data tables.
 * Header shows title + count + columns toggle; body holds the <Table>.
 */
export function DataTableCard({
  title,
  count,
  actions,
  columns,
  isVisible,
  toggle,
  reset,
  className,
  bodyClassName,
  children,
}: DataTableCardProps) {
  const showColumnsToggle = !!columns && !!toggle && !!isVisible;

  return (
    <Card className={cn("overflow-hidden border-border", className)}>
      {(title || actions || showColumnsToggle) && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
            )}
            {count !== undefined && count !== null && (
              <Badge variant="secondary" className="rounded-full px-2 text-xs">
                {count}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            {showColumnsToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[60vh] overflow-y-auto bg-popover">
                  <DropdownMenuLabel>Show / hide columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {columns!.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.key}
                      checked={isVisible!(c.key)}
                      disabled={c.required}
                      onCheckedChange={() => toggle!(c.key)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {c.label}
                      {c.required && (
                        <span className="ml-auto text-[10px] text-muted-foreground">required</span>
                      )}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {reset && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={reset} className="gap-2 text-xs">
                        <RotateCcw className="h-3.5 w-3.5" /> Reset to default
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}
      <div className={cn("overflow-x-auto", bodyClassName)}>{children}</div>
    </Card>
  );
}
