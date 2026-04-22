import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useLanguage } from "@/contexts/LanguageContext";
import { InstallAppButton } from "./InstallAppButton";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export function InstallAppBanner({ className }: Props) {
  const { canShowBanner, dismiss } = useInstallPrompt();
  const { t } = useLanguage();

  if (!canShowBanner) return null;

  return (
    <div
      className={cn(
        "relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 flex items-center gap-3 shadow-sm",
        className,
      )}
    >
      <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">
          {t("অ্যাপ হিসেবে ইনস্টল করুন", "Install as App")}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {t("ফোন/ডেস্কটপে আইকন যোগ করুন — দ্রুত access", "Add to home screen for quick access")}
        </div>
      </div>
      <InstallAppButton variant="compact" />
      <button
        type="button"
        onClick={dismiss}
        className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
