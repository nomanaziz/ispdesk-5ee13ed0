import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme, themes, ThemeName } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 border-border/60">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Choose Theme</p>
        <div className="space-y-1">
          {themes.map((t) => (
            <button
              key={t.name}
              onClick={() => setTheme(t.name)}
              className={cn(
                "flex items-center gap-3 w-full rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                theme === t.name && "bg-accent font-medium"
              )}
            >
              <span
                className="h-4 w-4 rounded-full border border-border/60 shrink-0"
                style={{ background: t.preview }}
              />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
