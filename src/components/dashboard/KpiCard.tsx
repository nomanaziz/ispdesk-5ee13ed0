import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "blue" | "emerald" | "amber" | "rose" | "violet" | "cyan";

const toneMap: Record<KpiTone, string> = {
  blue:    "from-sky-500 via-blue-500 to-indigo-600",
  emerald: "from-emerald-500 via-teal-500 to-cyan-600",
  amber:   "from-amber-400 via-orange-500 to-rose-500",
  rose:    "from-rose-500 via-pink-500 to-fuchsia-600",
  violet:  "from-violet-500 via-purple-500 to-indigo-600",
  cyan:    "from-cyan-400 via-sky-500 to-blue-600",
};

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: KpiTone;
  delta?: number; // percent
  to?: string;
  caption?: string;
}

export function KpiCard({ label, value, icon: Icon, tone = "blue", delta, to, caption }: Props) {
  const positive = (delta ?? 0) >= 0;
  const card = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 text-white shadow-lg shadow-black/10 transition-all duration-300",
        "bg-gradient-to-br", toneMap[tone],
        to && "cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/20"
      )}
    >
      {/* decorative blob */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">{label}</p>
          <p className="text-4xl font-extrabold leading-none tracking-tight">{value}</p>
          {typeof delta === "number" && (
            <div className="flex items-center gap-1.5 pt-2">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
                  positive ? "bg-white/20 text-white" : "bg-black/20 text-white"
                )}
              >
                {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {positive ? "+" : ""}{delta.toFixed(1)}%
              </span>
              {caption && <span className="text-[11px] text-white/70">{caption}</span>}
            </div>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {to && (
        <div className="relative mt-4 flex items-center justify-between border-t border-white/15 pt-3 text-[11px] font-medium text-white/85">
          <span>বিস্তারিত দেখুন</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

export default KpiCard;
