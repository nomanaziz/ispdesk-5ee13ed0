import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Lucide icon component (preferred) */
  icon?: LucideIcon;
  /** Legacy: ignored — kept so existing callers don't break */
  icons8?: string;
  /** Right-side action slot (buttons). */
  action?: ReactNode;
  className?: string;
}

/**
 * Unified page header used across every admin page.
 * Identical visual pattern: icon chip + title + description + right actions.
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 flex-wrap",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="shrink-0 rounded-md bg-[hsl(var(--table-head))] text-[hsl(var(--table-head-foreground))] p-2">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
