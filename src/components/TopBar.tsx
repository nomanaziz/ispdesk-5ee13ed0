import { useState, useEffect } from "react";
import { LogOut, User, Globe, Search, Bell, Palette, Settings, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
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
      <header className="h-[62px] border-b border-border/40 bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 px-3 text-muted-foreground hover:text-foreground w-52 justify-start hidden sm:flex border-border/60 bg-muted/30"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">{t("ক্লায়েন্ট অনুসন্ধান...", "Search clients...")}</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Button variant="ghost" size="sm" className="h-9 sm:hidden" onClick={() => setSearchOpen(true)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => setQuickAddOpen(true)}
            title={t("দ্রুত ক্লায়েন্ট যোগ", "Quick Add Client")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline text-xs">{t("দ্রুত যোগ", "Quick Add")}</span>
          </Button>
          {/* Language Toggle */}
          <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 p-0.5 h-8" role="group" aria-label="Language">
            <button
              type="button"
              onClick={() => setLang("bn")}
              className={cn(
                "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
                lang === "bn" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="বাংলা"
            >
              বাং
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={cn(
                "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
                lang === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="English"
            >
              EN
            </button>
          </div>
          <Link to="/" target="_blank" title={t("ওয়েবসাইটে যান", "Open website")}>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
            </Button>
          </Link>
          <ThemeSwitcher />
          <NotesButton ownerType="admin" />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title={t("থিম কাস্টমাইজার", "Theme customizer")}
            onClick={() => setThemeOpen(true)}
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title={t("কুইক সেটিংস", "Quick settings")}
            onClick={() => setQuickOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-9 px-2">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-xs font-medium truncate max-w-[120px]">{displayName}</p>
                  {roles.length > 0 && (
                    <p className="text-[10px] text-muted-foreground capitalize">{roles[0]?.replace("_", " ")}</p>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/dashboard/system/company")}>
                <User className="mr-2 h-4 w-4" /> {t("প্রোফাইল", "Profile")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { signOut(); navigate("/login"); }} className="text-destructive">
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
