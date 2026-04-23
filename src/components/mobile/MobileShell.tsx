import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  header?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
  scope?: "portal" | "pop";
  className?: string;
  /** Negative top margin so content cards overlap curved gradient header */
  overlap?: boolean;
}

export function MobileShell({ header, bottomNav, children, scope = "portal", className, overlap = true }: Props) {
  return (
    <div
      data-theme-scope={scope}
      className={cn("min-h-screen m-screen flex flex-col", className)}
    >
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col relative">
        {header}
        <main className={cn(
          "flex-1 px-4 pb-28",
          overlap && header ? "-mt-6 relative z-10" : "pt-4",
        )}>
          {children}
        </main>
        {bottomNav}
      </div>
    </div>
  );
}
