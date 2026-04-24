import { useState } from "react";
import { Download, Share, Plus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "icon" | "default" | "compact" | "chip";
  className?: string;
  /** When true, render even if browser can't natively prompt — clicking shows a friendly fallback. */
  alwaysRender?: boolean;
}

export function InstallAppButton({ variant = "default", className, alwaysRender = false }: Props) {
  const { canShow, canPromptNative, isIOS, installed, promptInstall } = useInstallPrompt();
  const { t } = useLanguage();
  const [iosOpen, setIosOpen] = useState(false);

  if (!canShow && !alwaysRender) return null;

  const handleClick = async () => {
    if (installed) {
      toast({
        title: t("✅ ইতিমধ্যে ইনস্টল করা", "✅ Already installed"),
        description: t("অ্যাপ আগে থেকেই হোম স্ক্রিনে যোগ করা আছে", "The app is already on your home screen"),
      });
      return;
    }
    if (canPromptNative) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast({
          title: t("✅ ইনস্টল হয়েছে", "✅ Installed"),
          description: t("হোম স্ক্রিনে অ্যাপ যোগ হয়েছে", "App added to your home screen"),
        });
      }
      return;
    }
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    toast({
      title: t("ইনস্টল উপলব্ধ নয়", "Install not available"),
      description: t(
        "এই ব্রাউজারে install support করে না। Chrome বা Edge ব্যবহার করুন, অথবা ব্রাউজার মেনু থেকে 'Install app' নির্বাচন করুন।",
        "This browser doesn't support install. Use Chrome or Edge, or pick 'Install app' from the browser menu.",
      ),
    });
  };

  const label = t("ইনস্টল করুন", "Install App");
  const title = t("অ্যাপ ইনস্টল করুন", "Install app");

  return (
    <>
      {variant === "icon" && (
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", className)}
          onClick={handleClick}
          title={title}
          aria-label={title}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}

      {variant === "compact" && (
        <Button
          size="sm"
          variant="outline"
          className={cn("h-9 gap-1.5", className)}
          onClick={handleClick}
        >
          <Download className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </Button>
      )}

      {variant === "chip" && (
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "fixed bottom-6 left-24 z-50 h-12 px-4 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl flex items-center gap-2 hover:scale-105 transition-transform text-sm font-semibold",
            className,
          )}
          title={title}
        >
          <Smartphone className="h-4 w-4" />
          <span>{label}</span>
        </button>
      )}

      {variant === "default" && (
        <Button onClick={handleClick} className={cn("gap-2", className)}>
          <Download className="h-4 w-4" />
          {label}
        </Button>
      )}

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t("iPhone/iPad-এ ইনস্টল করুন", "Install on iPhone/iPad")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Safari ব্রাউজার থেকে নিচের ধাপগুলি অনুসরণ করুন",
                "Follow these steps in Safari to add the app",
              )}
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-4 mt-2">
            <li className="flex gap-3 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t("নিচের", "Tap the")} <Share className="inline h-4 w-4 mx-1 text-primary" />
                  {t("শেয়ার বাটনে ট্যাপ করুন", "Share button below")}
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center flex-wrap gap-1">
                  {t("নির্বাচন করুন", "Choose")}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{t("হোম স্ক্রিনে যোগ করুন", "Add to Home Screen")}</span>
                  </span>
                </p>
              </div>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t('উপরে ডানে "Add" ট্যাপ করুন', 'Tap "Add" at the top right')}
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            {t(
              "ইনস্টলের পর হোম স্ক্রিন থেকে অ্যাপের মতো খুলবে — কোনো ব্রাউজার বার থাকবে না।",
              "After installing, open it from your home screen — it runs like a native app with no browser bar.",
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
