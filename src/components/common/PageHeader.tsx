import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import { resolveByPath, resolveIcons8 } from "@/lib/iconResolver";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Override the auto-resolved Icons8 name. */
  icons8?: string;
  /** Right-side action slot (buttons). */
  action?: ReactNode;
  /** Icon size in px. Default 44. */
  size?: number;
  className?: string;
}

/**
 * Consistent page header with auto-resolved Icons8 illustration.
 * Falls back gracefully when no icon is found for the route.
 */
export function PageHeader({
  title,
  description,
  icons8,
  action,
  size = 44,
  className,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const resolved =
    icons8 ||
    resolveByPath(pathname) ||
    resolveIcons8({ title }) ||
    undefined;
  const showIcon = hasIcons8Icon(resolved);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 flex-wrap",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showIcon && (
          <div className="shrink-0 rounded-xl bg-muted/40 dark:bg-white/5 p-2 group">
            <Icons8Icon name={resolved!} size={size} />
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
