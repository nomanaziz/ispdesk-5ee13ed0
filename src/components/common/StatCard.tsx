import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Icons8 PNG name (preferred). */
  icons8?: string;
  /** Lucide fallback element when Icons8 name missing. */
  fallbackIcon?: ReactNode;
  /** Optional trend or hint text below the value. */
  hint?: ReactNode;
  /** Tailwind tint for the icon tile background. Default neutral. */
  tint?: string;
  className?: string;
  loading?: boolean;
}

/**
 * Compact KPI stat card used across dashboards / list pages.
 * Renders a colorful Icons8 illustration when available.
 */
export function StatCard({
  label,
  value,
  icons8,
  fallbackIcon,
  hint,
  tint = "bg-muted/50 dark:bg-white/5",
  className,
  loading,
}: StatCardProps) {
  const useIcons8 = hasIcons8Icon(icons8);
  return (
    <Card className={cn("overflow-hidden group", className)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "shrink-0 rounded-xl p-2 flex items-center justify-center",
              tint,
            )}
          >
            {useIcons8 ? (
              <Icons8Icon name={icons8!} size={36} />
            ) : (
              fallbackIcon
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {label}
            </p>
            {loading ? (
              <div className="h-7 w-16 bg-muted/60 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xl md:text-2xl font-bold leading-tight">
                {value}
              </p>
            )}
            {hint && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {hint}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
