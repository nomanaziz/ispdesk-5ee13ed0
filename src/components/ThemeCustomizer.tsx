import { Settings, Sun, Moon, Monitor, X, RotateCcw, LayoutGrid, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme, primaryColors, ThemeMode, ThemeSkin } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

export function ThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const { settings, updateSettings, resetSettings } = useTheme();

  const modeOptions: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: "লাইট" },
    { value: "dark", icon: Moon, label: "ডার্ক" },
    { value: "system", icon: Monitor, label: "সিস্টেম" },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-primary text-primary-foreground p-2.5 rounded-l-lg shadow-lg hover:shadow-xl transition-all"
        title="থিম সেটিংস"
      >
        <Settings className="h-5 w-5 animate-spin" style={{ animationDuration: "4s" }} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[300px] sm:w-[340px] p-0 overflow-y-auto">
          <SheetHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">থিম কাস্টমাইজার</SheetTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">রিয়েল-টাইমে কাস্টমাইজ করুন</p>
          </SheetHeader>

          <Separator />

          <div className="px-5 py-4 space-y-6">
            {/* Primary Color */}
            <div>
              <h4 className="text-sm font-semibold mb-3">প্রাইমারি কালার</h4>
              <div className="flex flex-wrap gap-2.5">
                {primaryColors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => updateSettings({ primaryColor: color.name })}
                    className={cn(
                      "h-9 w-9 rounded-full transition-all flex items-center justify-center",
                      settings.primaryColor === color.name
                        ? "ring-2 ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    )}
                    style={{
                      background: `hsl(${color.hsl})`,
                      ...(settings.primaryColor === color.name ? { ringColor: `hsl(${color.hsl})` } : {}),
                    }}
                    title={color.label}
                  >
                    {settings.primaryColor === color.name && (
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Theme Mode */}
            <div>
              <h4 className="text-sm font-semibold mb-3">থিম মোড</h4>
              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ mode: opt.value })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-xs transition-all",
                      settings.mode === opt.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <opt.icon className="h-5 w-5" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Skin */}
            <div>
              <h4 className="text-sm font-semibold mb-3">স্কিন</h4>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "default" as ThemeSkin, label: "ডিফল্ট", desc: "শ্যাডো" },
                  { value: "bordered" as ThemeSkin, label: "বর্ডারড", desc: "বর্ডার" },
                ]).map((skin) => (
                  <button
                    key={skin.value}
                    onClick={() => updateSettings({ skin: skin.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-all",
                      settings.skin === skin.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LayoutGrid className="h-5 w-5" />
                    <span>{skin.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Content Width */}
            <div>
              <h4 className="text-sm font-semibold mb-3">কন্টেন্ট উইডথ</h4>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "wide" as const, label: "ওয়াইড" },
                  { value: "compact" as const, label: "কমপ্যাক্ট" },
                ]).map((w) => (
                  <button
                    key={w.value}
                    onClick={() => updateSettings({ contentWidth: w.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-all",
                      settings.contentWidth === w.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Maximize2 className="h-5 w-5" />
                    <span>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Reset */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={resetSettings}
            >
              <RotateCcw className="h-4 w-4" />
              রিসেট করুন
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
