import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface HeaderClockProps {
  compact?: boolean;
  className?: string;
  /** Use inverted colors (for dark/colored headers like primary bg) */
  onPrimary?: boolean;
}

export function HeaderClock({ compact = false, className, onPrimary = false }: HeaderClockProps) {
  const { lang } = useLanguage();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const locale = lang === "bn" ? "bn-BD" : "en-US";

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(now);

  const subColor = onPrimary ? "text-primary-foreground/75" : "text-muted-foreground";
  const mainColor = onPrimary ? "text-primary-foreground" : "text-foreground";

  if (compact) {
    return (
      <div
        className={cn(
          "font-mono tabular-nums text-xs font-semibold leading-none px-2 py-1 rounded-md",
          mainColor,
          className,
        )}
        title={date}
      >
        {time}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "hidden md:flex flex-col items-end leading-tight px-2.5 py-1 rounded-md border border-border/50 bg-muted/30",
        onPrimary && "border-primary-foreground/20 bg-primary-foreground/10",
        className,
      )}
    >
      <span className={cn("font-mono tabular-nums text-sm font-semibold", mainColor)}>
        {time}
      </span>
      <span className={cn("text-[10px]", subColor)}>{date}</span>
    </div>
  );
}
