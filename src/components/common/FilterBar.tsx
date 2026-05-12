import { ReactNode, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  title?: string;
  /** Show reset button — fires onReset */
  onReset?: () => void;
  /** Default to collapsed on mount */
  defaultCollapsed?: boolean;
  /** Hide the collapse toggle entirely */
  alwaysOpen?: boolean;
  /** Right-side actions (e.g. Apply / Export) */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Reusable filter section card.
 * Visual: muted header strip with funnel icon + title + collapse / reset / actions.
 * Body: consumer-supplied grid of inputs.
 */
export function FilterBar({
  title = "Filters",
  onReset,
  defaultCollapsed = false,
  alwaysOpen = false,
  actions,
  className,
  children,
}: FilterBarProps) {
  const [open, setOpen] = useState(!defaultCollapsed);
  const isOpen = alwaysOpen || open;

  return (
    <Card className={cn("overflow-hidden border-border", className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-muted/60 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/80">
          <Filter className="h-4 w-4 text-amber-600" />
          {title}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {onReset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 gap-1 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          )}
          {!alwaysOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen((p) => !p)}
              className="h-7 gap-1 text-xs"
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="hidden sm:inline">{isOpen ? "Hide" : "Show"}</span>
            </Button>
          )}
        </div>
      </div>
      {isOpen && <div className="p-4">{children}</div>}
    </Card>
  );
}
