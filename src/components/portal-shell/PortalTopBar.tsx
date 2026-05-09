import { useState, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut, User, Globe, Languages, Palette, Settings,
  Smartphone, Share, Plus, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { QuickSettings } from "@/components/QuickSettings";
import { NotesButton } from "@/components/notes/NotesButton";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { toast } from "@/hooks/use-toast";
import { HeaderClock } from "@/components/HeaderClock";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

interface PortalTopBarProps {
  /** Notes owner (matches NotesButton ownerType) */
  notesOwner?: "reseller" | "bw_customer" | "admin";
  /** Path to navigate to for "Profile / Settings" link */
  profilePath?: string;
  /** Optional extra slot rendered before the user dropdown */
  extra?: ReactNode;
}

export function PortalTopBar({
  notesOwner = "reseller",
  profilePath,
  extra,
}: PortalTopBarProps) {
  const { customer, logout } = usePortalAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const { canPromptNative, isIOS, installed, promptInstall } = useInstallPrompt();

  const displayName = customer?.name || customer?.username || "User";
  const subLabel = customer?.type === "reseller_sub"
    ? t("সাব ইউজার", "Sub-user")
    : customer?.type === "bw_customer"
      ? t("বিডব্লিউ কাস্টমার", "BW customer")
      : customer?.type === "reseller"
        ? t("পপ ম্যানেজার", "POP manager")
        : "";

  const handleInstallApp = async () => {
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
    if (isIOS) { setIosHelpOpen(true); return; }
    toast({
      title: t("ইনস্টল উপলব্ধ নয়", "Install not available"),
      description: t(
        "এই ব্রাউজারে install support করে না।",
        "This browser doesn't support install.",
      ),
    });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="h-[62px] border-b border-border/40 bg-card/95 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <div className="hidden lg:block">
            <HeaderClock />
          </div>

          {extra}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-9 px-1.5 sm:px-2">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <p className="text-xs font-medium truncate max-w-[140px]">{displayName}</p>
                  {subLabel && (
                    <p className="text-[10px] text-muted-foreground capitalize truncate">{subLabel}</p>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold truncate">{displayName}</div>
                {subLabel && (
                  <div className="text-[11px] text-muted-foreground capitalize">{subLabel}</div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {profilePath && (
                <DropdownMenuItem onClick={() => navigate(profilePath)}>
                  <User className="mr-2 h-4 w-4" /> {t("প্রোফাইল", "Profile")}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-accent/50 p-0">
                <div className="w-full px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center text-sm"><StickyNote className="mr-2 h-4 w-4" />{t("আমার নোট", "My notes")}</span>
                  <NotesButton ownerType={notesOwner} />
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Languages className="mr-2 h-4 w-4" /> {t("ভাষা", "Language")}
                  <span className="ml-auto text-[10px] text-muted-foreground">{lang === "bn" ? "বাং" : "EN"}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setLang("bn")} className={cn(lang === "bn" && "bg-accent")}>বাংলা</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLang("en")} className={cn(lang === "en" && "bg-accent")}>English</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-accent/50 p-0">
                <div className="w-full px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm">{t("থিম মোড", "Theme mode")}</span>
                  <ThemeSwitcher />
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setThemeOpen(true)}>
                <Palette className="mr-2 h-4 w-4" /> {t("থিম কাস্টমাইজার", "Theme customizer")}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setQuickOpen(true)}>
                <Settings className="mr-2 h-4 w-4" /> {t("কুইক সেটিংস", "Quick settings")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to="/" target="_blank" className="cursor-pointer">
                  <Globe className="mr-2 h-4 w-4" /> {t("ওয়েবসাইটে যান", "Open website")}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleInstallApp}>
                <Smartphone className="mr-2 h-4 w-4" /> {t("অ্যাপ ইনস্টল করুন", "Install app")}
                {installed && <span className="ml-auto text-[10px] text-emerald-600 font-semibold">✓</span>}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> {t("সাইন আউট", "Sign out")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ThemeCustomizer open={themeOpen} onOpenChange={setThemeOpen} />
      <QuickSettings open={quickOpen} onOpenChange={setQuickOpen} />

      <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t("iPhone/iPad-এ ইনস্টল করুন", "Install on iPhone/iPad")}
            </DialogTitle>
            <DialogDescription>
              {t("Safari ব্রাউজার থেকে নিচের ধাপগুলি অনুসরণ করুন", "Follow these steps in Safari to add the app")}
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 mt-2">
            <li className="flex gap-3 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              <p className="text-sm font-medium flex-1">
                {t("নিচের", "Tap the")} <Share className="inline h-4 w-4 mx-1 text-primary" />
                {t("শেয়ার বাটনে ট্যাপ করুন", "Share button below")}
              </p>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              <p className="text-sm font-medium flex-1 flex items-center flex-wrap gap-1">
                {t("নির্বাচন করুন", "Choose")}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{t("হোম স্ক্রিনে যোগ করুন", "Add to Home Screen")}</span>
                </span>
              </p>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              <p className="text-sm font-medium flex-1">{t('উপরে ডানে "Add" ট্যাপ করুন', 'Tap "Add" at the top right')}</p>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
