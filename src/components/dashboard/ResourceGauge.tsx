import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;       // 0-100
  tone?: "emerald" | "amber" | "rose" | "sky" | "violet";
  caption?: string;
}

const colorMap = {
  emerald: "stroke-emerald-600",
  amber:   "stroke-amber-500",
  rose:    "stroke-rose-600",
  sky:     "stroke-violet-600",
  violet:  "stroke-violet-600",
};

export function ResourceGauge({ label, value, tone = "sky", caption }: Props) {
  const v = Math.min(100, Math.max(0, value));
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - v / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={radius} className="fill-none stroke-muted" strokeWidth="7" />
          <circle
            cx="40" cy="40" r={radius}
            className={cn("fill-none transition-all duration-700", colorMap[tone])}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-foreground">{Math.round(v)}%</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-foreground">{label}</p>
      {caption && <p className="text-[10px] text-muted-foreground">{caption}</p>}
    </div>
  );
}

export default ResourceGauge;
