import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TileTone = "sky" | "emerald" | "amber" | "rose" | "violet" | "indigo" | "teal" | "pink" | "orange" | "cyan" | "lime" | "fuchsia";

const tones: Record<TileTone, { bar: string; iconBg: string; iconText: string; ring: string }> = {
  sky:     { bar: "from-sky-500/15 to-sky-500/0",         iconBg: "bg-sky-500/15",     iconText: "text-sky-600 dark:text-sky-400",         ring: "hover:ring-sky-500/30" },
  emerald: { bar: "from-emerald-500/15 to-emerald-500/0", iconBg: "bg-emerald-500/15", iconText: "text-emerald-600 dark:text-emerald-400", ring: "hover:ring-emerald-500/30" },
  amber:   { bar: "from-amber-500/15 to-amber-500/0",     iconBg: "bg-amber-500/15",   iconText: "text-amber-600 dark:text-amber-400",     ring: "hover:ring-amber-500/30" },
  rose:    { bar: "from-rose-500/15 to-rose-500/0",       iconBg: "bg-rose-500/15",    iconText: "text-rose-600 dark:text-rose-400",       ring: "hover:ring-rose-500/30" },
  violet:  { bar: "from-violet-500/15 to-violet-500/0",   iconBg: "bg-violet-500/15",  iconText: "text-violet-600 dark:text-violet-400",   ring: "hover:ring-violet-500/30" },
  indigo:  { bar: "from-indigo-500/15 to-indigo-500/0",   iconBg: "bg-indigo-500/15",  iconText: "text-indigo-600 dark:text-indigo-400",   ring: "hover:ring-indigo-500/30" },
  teal:    { bar: "from-teal-500/15 to-teal-500/0",       iconBg: "bg-teal-500/15",    iconText: "text-teal-600 dark:text-teal-400",       ring: "hover:ring-teal-500/30" },
  pink:    { bar: "from-pink-500/15 to-pink-500/0",       iconBg: "bg-pink-500/15",    iconText: "text-pink-600 dark:text-pink-400",       ring: "hover:ring-pink-500/30" },
  orange:  { bar: "from-orange-500/15 to-orange-500/0",   iconBg: "bg-orange-500/15",  iconText: "text-orange-600 dark:text-orange-400",   ring: "hover:ring-orange-500/30" },
  cyan:    { bar: "from-cyan-500/15 to-cyan-500/0",       iconBg: "bg-cyan-500/15",    iconText: "text-cyan-600 dark:text-cyan-400",       ring: "hover:ring-cyan-500/30" },
  lime:    { bar: "from-lime-500/15 to-lime-500/0",       iconBg: "bg-lime-500/15",    iconText: "text-lime-600 dark:text-lime-400",       ring: "hover:ring-lime-500/30" },
  fuchsia: { bar: "from-fuchsia-500/15 to-fuchsia-500/0", iconBg: "bg-fuchsia-500/15", iconText: "text-fuchsia-600 dark:text-fuchsia-400", ring: "hover:ring-fuchsia-500/30" },
};

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: TileTone;
  to?: string;
  hint?: string;
}

export function MetricTile({ label, value, icon: Icon, tone = "sky", to, hint }: Props) {
  const t = tones[tone];
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all duration-300",
        "ring-1 ring-transparent",
        to && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
        t.ring
      )}
    >
      <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b", t.bar)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/75 truncate">{label}</p>
          <p className="text-2xl font-bold leading-tight text-foreground tracking-tight">{value}</p>
          {hint && <p className="text-[11px] font-medium text-foreground/65">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", t.iconBg, t.iconText)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      {to && (
        <div className="relative mt-3 flex items-center gap-1 text-[11px] font-semibold text-foreground/70 group-hover:text-foreground">
          বিস্তারিত দেখুন
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default MetricTile;
