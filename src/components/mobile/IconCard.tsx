import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconTint =
  | "rose" | "violet" | "indigo" | "sky" | "teal" | "emerald"
  | "amber" | "orange" | "pink" | "cyan" | "slate";

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
  to?: string;
  onClick?: () => void;
  icon: LucideIcon;
  label: string;
  tint?: IconTint;
  badge?: string | number;
  className?: string;
}

export function IconCard({ to, onClick, icon: Icon, label, tint = "rose", badge, className }: Props) {
  const inner = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl bg-card",
      "shadow-[var(--m-shadow-soft)] active:scale-95 transition-transform",
      "hover:shadow-md cursor-pointer text-center",
      className,
    )}>
      <div className="relative">
        <span className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", tintMap[tint])}>
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
        {badge != null && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[11.5px] font-medium leading-tight text-foreground line-clamp-2">{label}</span>
    </div>
  );
  if (to) return <Link to={to} className="block">{inner}</Link>;
  return <button type="button" onClick={onClick} className="w-full">{inner}</button>;
}
