import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  /** Icons8 PNG name (preferred). Falls back to a lucide Inbox icon. */
  icons8?: string | null;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Illustration size in px. Default 96. */
  size?: number;
}

/**
 * Friendly empty state for list pages.
 * Use a colorful Icons8 illustration + title + optional description/CTA.
 */
export function EmptyState({
  icons8,
  title,
  description,
  action,
  className,
  size = 96,
}: EmptyStateProps) {
  const useIcons8 = hasIcons8Icon(icons8);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 gap-3",
        className,
      )}
    >
      <div className="rounded-2xl bg-muted/40 dark:bg-white/5 p-4 mb-2">
        {useIcons8 ? (
          <Icons8Icon name={icons8!} size={size} interactive={false} />
        ) : (
          <Inbox className="text-muted-foreground" style={{ width: size * 0.7, height: size * 0.7 }} strokeWidth={1.5} />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
