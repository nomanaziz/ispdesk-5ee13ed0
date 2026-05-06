import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "primary" | "success" | "warning" | "danger" | "blue" | "emerald" | "amber" | "rose" | "violet" | "cyan";

const toneMap: Record<string, { bar: string; iconBg: string; iconText: string }> = {
  primary: { bar: "bg-violet-600",  iconBg: "bg-violet-100 dark:bg-violet-500/15",  iconText: "text-violet-600 dark:text-violet-300" },
  success: { bar: "bg-emerald-600", iconBg: "bg-emerald-100 dark:bg-emerald-500/15", iconText: "text-emerald-600 dark:text-emerald-300" },
  warning: { bar: "bg-amber-500",   iconBg: "bg-amber-100 dark:bg-amber-500/15",   iconText: "text-amber-600 dark:text-amber-300" },
  danger:  { bar: "bg-rose-600",    iconBg: "bg-rose-100 dark:bg-rose-500/15",     iconText: "text-rose-600 dark:text-rose-300" },
  // legacy aliases
  blue:    { bar: "bg-violet-600",  iconBg: "bg-violet-100 dark:bg-violet-500/15",  iconText: "text-violet-600 dark:text-violet-300" },
  emerald: { bar: "bg-emerald-600", iconBg: "bg-emerald-100 dark:bg-emerald-500/15", iconText: "text-emerald-600 dark:text-emerald-300" },
  amber:   { bar: "bg-amber-500",   iconBg: "bg-amber-100 dark:bg-amber-500/15",   iconText: "text-amber-600 dark:text-amber-300" },
  rose:    { bar: "bg-rose-600",    iconBg: "bg-rose-100 dark:bg-rose-500/15",     iconText: "text-rose-600 dark:text-rose-300" },
  violet:  { bar: "bg-violet-600",  iconBg: "bg-violet-100 dark:bg-violet-500/15",  iconText: "text-violet-600 dark:text-violet-300" },
  cyan:    { bar: "bg-emerald-600", iconBg: "bg-emerald-100 dark:bg-emerald-500/15", iconText: "text-emerald-600 dark:text-emerald-300" },
};

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: KpiTone;
  delta?: number;
  to?: string;
  caption?: string;
}

export function KpiCard({ label, value, icon: Icon, tone = "primary", delta, to, caption }: Props) {
  const t = toneMap[tone] ?? toneMap.primary;
  const positive = (delta ?? 0) >= 0;

  const card = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200",
        to && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70">{label}</p>
          <p className="text-4xl font-extrabold leading-none tracking-tight text-foreground">{value}</p>
          {typeof delta === "number" && (
            <div className="flex items-center gap-1.5 pt-1.5">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
                  positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                           : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
                )}
              >
                {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {positive ? "+" : ""}{delta.toFixed(1)}%
              </span>
              {caption && <span className="text-[11px] text-foreground/60">{caption}</span>}
            </div>
          )}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", t.iconBg, t.iconText)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {to && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] font-semibold text-foreground/70">
          <span>বিস্তারিত দেখুন</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default KpiCard;
