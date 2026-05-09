import { useState, useEffect } from "react";
import {
  LogOut, User, Globe, Search, Bell, Palette, Settings, MoreVertical,
  Activity, Languages, StickyNote, Smartphone, Share, Plus, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ThemeCustomizer } from "@/components/ThemeCustomizer";
import { QuickSettings } from "@/components/QuickSettings";
import { GlobalClientSearch } from "@/components/GlobalClientSearch";
import { NotesButton } from "@/components/notes/NotesButton";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { toast } from "@/hooks/use-toast";
import { HeaderClock } from "@/components/HeaderClock";
import { AdminNotificationBell } from "@/components/notifications/AdminNotificationBell";
import { QuickCreateMenu } from "@/components/QuickCreateMenu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { user, roles, signOut, isAdmin } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const { canPromptNative, isIOS, installed, promptInstall } = useInstallPrompt();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

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
    if (isIOS) {
      setIosHelpOpen(true);
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <header className="h-[62px] border-b border-border/40 bg-card/95 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
        {/* Left */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 px-3 text-muted-foreground hover:text-foreground w-52 justify-start hidden lg:flex border-border/60 bg-muted/30"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">{t("ক্লায়েন্ট অনুসন্ধান...", "Search clients...")}</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 lg:hidden text-muted-foreground"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Right — minimal: Clock, Online Monitoring, Notifications, User */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Clock: desktop only */}
          <div className="hidden lg:block">
            <HeaderClock />
          </div>

          {/* Online Client Monitoring — quick link, always visible */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/dashboard/monitoring/online")}
            title={t("অনলাইন ক্লায়েন্ট মনিটরিং", "Online Client Monitoring")}
            aria-label="Online Client Monitoring"
          >
            <Activity className="h-4 w-4" />
          </Button>

          {/* Accounting Dashboard — admin only */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/dashboard/accounting")}
              title={t("অ্যাকাউন্টিং ড্যাশবোর্ড", "Accounting Dashboard")}
              aria-label="Accounting Dashboard"
            >
              <Wallet className="h-4 w-4" />
            </Button>
          )}

          {/* Quick Create (+) */}
          <QuickCreateMenu />

          {/* Notifications */}
          <AdminNotificationBell />

          {/* User menu — contains profile, notes, language, theme, settings, website, install, sign out */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-9 px-1.5 sm:px-2">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <p className="text-xs font-medium truncate max-w-[120px]">{displayName}</p>
                  {roles.length > 0 && (
                    <p className="text-[10px] text-muted-foreground capitalize">{roles[0]?.replace("_", " ")}</p>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold truncate">{displayName}</div>
                {roles.length > 0 && (
                  <div className="text-[11px] text-muted-foreground capitalize">{roles[0]?.replace("_", " ")}</div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => navigate("/dashboard/system/company")}>
                <User className="mr-2 h-4 w-4" /> {t("প্রোফাইল", "Profile")}
              </DropdownMenuItem>

              {/* Own Notes */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-accent/50 p-0">
                <div className="w-full px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center text-sm"><StickyNote className="mr-2 h-4 w-4" />{t("আমার নোট", "My notes")}</span>
                  <NotesButton ownerType="admin" />
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Language */}
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

              {/* Theme mode */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-accent/50 p-0">
                <div className="w-full px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm">{t("থিম মোড", "Theme mode")}</span>
                  <ThemeSwitcher />
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setThemeOpen(true)}>
                <Palette className="mr-2 h-4 w-4" />
                {t("থিম কাস্টমাইজার", "Theme customizer")}
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setQuickOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                {t("কুইক সেটিংস", "Quick settings")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link to="/" target="_blank" className="cursor-pointer">
                  <Globe className="mr-2 h-4 w-4" />
                  {t("ওয়েবসাইটে যান", "Open website")}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleInstallApp}>
                <Smartphone className="mr-2 h-4 w-4" />
                {t("অ্যাপ ইনস্টল করুন", "Install app")}
                {installed && (
                  <span className="ml-auto text-[10px] text-emerald-600 font-semibold">✓</span>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { signOut(); navigate("/login"); }} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> {t("সাইন আউট", "Sign out")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <GlobalClientSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ThemeCustomizer open={themeOpen} onOpenChange={setThemeOpen} />
      <QuickSettings open={quickOpen} onOpenChange={setQuickOpen} />

      {/* iOS install instructions dialog */}
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
