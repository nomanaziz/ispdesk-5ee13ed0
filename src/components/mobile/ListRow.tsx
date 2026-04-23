import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LucideIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IconTint } from "./IconCard";

const tintMap: Record<IconTint, string> = {
  rose:    "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  violet:  "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  indigo:  "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  sky:     "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  teal:    "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber:   "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  orange:  "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
  pink:    "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300",
  cyan:    "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300",
  slate:   "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};

interface Props {
  icon?: LucideIcon;
  iconTint?: IconTint;
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: ReactNode;
  amountTone?: "success" | "danger" | "warning" | "neutral";
  badge?: ReactNode;
  to?: string;
  onClick?: () => void;
  rightExtra?: ReactNode;
  className?: string;
}

const amountToneMap = {
  success: "text-emerald-600",
  danger: "text-rose-600",
  warning: "text-amber-600",
  neutral: "text-foreground",
};

export function ListRow({
  icon: Icon, iconTint = "rose", title, subtitle, amount, amountTone = "neutral",
  badge, to, onClick, rightExtra, className,
}: Props) {
  const content = (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 m-card hover:shadow-md transition-shadow",
      to || onClick ? "cursor-pointer active:scale-[0.99] transition-transform" : "",
      className,
    )}>
      {Icon && (
        <div className={cn("h-11 w-11 rounded-full flex items-center justify-center shrink-0", tintMap[iconTint])}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground truncate">{title}</div>
          {badge}
        </div>
        {subtitle && <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {amount != null && (
          <div className={cn("font-bold text-sm text-right", amountToneMap[amountTone])}>{amount}</div>
        )}
        {rightExtra}
        {(to || onClick) && <ChevronRight className="h-4 w-4 text-muted-foreground/60" />}
      </div>
    </div>
  );

  if (to) return <Link to={to} className="block">{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="w-full text-left">{content}</button>;
  return content;
}
