import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title?: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  leftSlot?: ReactNode;
  /** Big stat shown center-bottom */
  statLabel?: ReactNode;
  statValue?: ReactNode;
  variant?: "rose" | "teal";
  className?: string;
  /** When true, header sits behind a curved bottom edge */
  curved?: boolean;
  children?: ReactNode;
}

export function GradientHeader({
  title, subtitle, rightSlot, leftSlot,
  statLabel, statValue, variant = "rose", className, curved = true, children,
}: Props) {
  return (
    <div
      className={cn(
        "relative px-5 pt-6 pb-10 text-white",
        variant === "rose" ? "m-hero-gradient" : "m-teal-gradient",
        curved && "rounded-b-[2rem]",
        "shadow-[0_8px_24px_hsl(340_82%_52%_/_0.25)]",
        className,
      )}
    >
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {leftSlot}
          <div className="min-w-0">
            {title && <div className="text-base font-semibold truncate">{title}</div>}
            {subtitle && <div className="text-xs text-white/85 truncate">{subtitle}</div>}
          </div>
        </div>
        {rightSlot && <div className="flex items-center gap-1.5 shrink-0">{rightSlot}</div>}
      </div>

      {(statLabel || statValue) && (
        <div className="relative mt-5 text-center">
          {statLabel && <div className="text-xs text-white/85 uppercase tracking-wide">{statLabel}</div>}
          {statValue && <div className="text-3xl font-extrabold mt-1 drop-shadow-sm">{statValue}</div>}
        </div>
      )}

      {children && <div className="relative mt-4">{children}</div>}
    </div>
  );
}
