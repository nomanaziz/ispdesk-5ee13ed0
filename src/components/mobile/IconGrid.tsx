import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  cols?: 3 | 4;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}

export function IconGrid({ children, cols = 3, className, title, action }: Props) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-1">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {action}
        </div>
      )}
      <div className={cn(
        "grid gap-3",
        cols === 3 ? "grid-cols-3" : "grid-cols-4",
      )}>
        {children}
      </div>
    </section>
  );
}
