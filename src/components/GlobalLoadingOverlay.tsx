import { Loader2 } from "lucide-react";
import { useGlobalLoading } from "@/stores/useGlobalLoading";

export function GlobalLoadingOverlay() {
  const { active, message, count } = useGlobalLoading();
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm animate-fade-in"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-5 shadow-lg animate-scale-in min-w-[240px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm font-medium text-foreground text-center">{message}</div>
        {count > 1 && (
          <div className="text-xs text-muted-foreground">
            {count}টি কাজ চলছে
          </div>
        )}
      </div>
    </div>
  );
}
