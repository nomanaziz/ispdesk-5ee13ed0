import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function PillTabs({ tabs, value, onChange, className }: Props) {
  return (
    <div className={cn("flex gap-2 p-1 rounded-full bg-muted/60 overflow-x-auto", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "flex-1 min-w-fit px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
              active
                ? "m-hero-gradient text-white shadow-[var(--m-shadow-pop)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count != null && (
              <span className={cn(
                "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                active ? "bg-white/25" : "bg-muted-foreground/15",
              )}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
