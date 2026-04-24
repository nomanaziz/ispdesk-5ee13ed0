import { useState, useEffect } from "react";
import {
  LogOut, User, Globe, Search, Bell, Palette, Settings, Plus, MoreVertical,
  Activity, Languages, StickyNote,
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
import { QuickCreateClientDialog } from "@/components/QuickCreateClientDialog";
import { InstallAppButton } from "@/components/InstallAppButton";
import { HeaderClock } from "@/components/HeaderClock";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const { user, roles, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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

        {/* Right — minimal: Clock, Quick Add, Online Monitoring, Notifications, User */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Clock: desktop only */}
          <div className="hidden lg:block">
            <HeaderClock />
          </div>

          {/* Quick Add — always visible */}
          <Button
            size="sm"
            className="h-9 gap-1.5 px-2.5 sm:px-3"
            onClick={() => setQuickAddOpen(true)}
            title={t("দ্রুত ক্লায়েন্ট যোগ", "Quick Add Client")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline text-xs">{t("দ্রুত যোগ", "Quick Add")}</span>
          </Button>

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

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground relative hidden sm:inline-flex"
            title={t("নোটিফিকেশন", "Notifications")}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>

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

              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-accent/50 p-0">
                <div className="w-full px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm">{t("অ্যাপ ইনস্টল", "Install app")}</span>
                  <InstallAppButton variant="icon" />
                </div>
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
      <QuickCreateClientDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
