import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "success" | "danger" | "info" | "warning";
  hint?: string;
}

interface Props {
  left: StatItem;
  right: StatItem;
  className?: string;
}

const tones = {
  success: { bar: "bg-emerald-500", text: "text-emerald-600", soft: "bg-emerald-50 dark:bg-emerald-500/10" },
  danger:  { bar: "bg-rose-500",    text: "text-rose-600",    soft: "bg-rose-50 dark:bg-rose-500/10" },
  info:    { bar: "bg-sky-500",     text: "text-sky-600",     soft: "bg-sky-50 dark:bg-sky-500/10" },
  warning: { bar: "bg-amber-500",   text: "text-amber-600",   soft: "bg-amber-50 dark:bg-amber-500/10" },
};

function StatBox({ item }: { item: StatItem }) {
  const t = tones[item.tone];
  const Icon = item.icon;
  return (
    <div className="flex-1 m-card p-4 flex items-center gap-3">
      <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center", t.soft)}>
        <Icon className={cn("h-5 w-5", t.text)} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold truncate">{item.label}</div>
        <div className={cn("text-lg font-extrabold leading-tight truncate", t.text)}>{item.value}</div>
        {item.hint && <div className="text-[10.5px] text-muted-foreground truncate">{item.hint}</div>}
      </div>
    </div>
  );
}

export function StatCardPair({ left, right, className }: Props) {
  return (
    <div className={cn("flex gap-3", className)}>
      <StatBox item={left} />
      <StatBox item={right} />
    </div>
  );
}
