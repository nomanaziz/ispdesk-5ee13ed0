import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText, HeadphonesIcon, LogOut, Menu, X,
  Activity, Bell, Clapperboard, BookOpen, ChevronDown, Rocket,
  ShoppingBag, Package, Receipt, Globe, UserCog, Languages, MessageSquare, Send,
  Home,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { KeyRound } from "lucide-react";
import NotificationBell from "@/components/portal/NotificationBell";
import { NotesButton } from "@/components/notes/NotesButton";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { InstallAppButton } from "@/components/InstallAppButton";
import { HeaderClock } from "@/components/HeaderClock";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";

type IconTint =
  | "indigo" | "blue" | "green" | "amber" | "teal" | "purple"
  | "rose" | "cyan" | "emerald" | "pink" | "orange" | "violet" | "red" | "sky";

const tintTile: Record<IconTint, string> = {
  indigo:  "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
  blue:    "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  green:   "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300",
  amber:   "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
  teal:    "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
  purple:  "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
  rose:    "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
  cyan:    "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  pink:    "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300",
  orange:  "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
  violet:  "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  red:     "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300",
  sky:     "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
};

const menuItems: { bn: string; en: string; icon: any; path: string; tint: IconTint; icons8?: string }[] = [
  { bn: "ড্যাশবোর্ড", en: "Dashboard", icon: Home, path: "/portal/dashboard", tint: "indigo", icons8: "business" },
  { bn: "আমার প্রোফাইল", en: "My Profile", icon: UserCog, path: "/portal/profile", tint: "blue", icons8: "manager" },
  { bn: "লাইভ ব্যবহার", en: "Live Usage", icon: Activity, path: "/portal/live-usage", tint: "green", icons8: "data-transfer" },
  { bn: "নোটিশ", en: "Notices", icon: Bell, path: "/portal/notices", tint: "amber", icons8: "news" },
  { bn: "চেঞ্জ/আপডেট", en: "Change/Update", icon: Send, path: "/portal/change-request", tint: "teal", icons8: "process" },
  { bn: "মুভি/FTP সার্ভার", en: "Movie/FTP Servers", icon: Clapperboard, path: "/portal/media", tint: "purple", icons8: "shared-folder" },
  { bn: "স্পিড টেস্ট", en: "Speed Test", icon: Rocket, path: "/portal/speed-test", tint: "rose", icons8: "increase" },
  { bn: "আমার লেজার", en: "My Ledger", icon: BookOpen, path: "/portal/ledger", tint: "cyan", icons8: "address-book" },
  { bn: "মাসিক বিল", en: "Monthly Bills", icon: Receipt, path: "/portal/bills", tint: "emerald", icons8: "documents" },
  { bn: "ইনভয়েস", en: "Invoices", icon: FileText, path: "/portal/invoices", tint: "teal", icons8: "documents" },
  { bn: "শপ", en: "Shop", icon: ShoppingBag, path: "/portal/shop", tint: "pink", icons8: "shopping-mall" },
  { bn: "আমার অর্ডার", en: "My Orders", icon: Package, path: "/portal/my-orders", tint: "orange", icons8: "delivery-time" },
  { bn: "আমার মেসেজ", en: "My Messages", icon: MessageSquare, path: "/portal/messages", tint: "violet", icons8: "comments" },
  { bn: "সাপোর্ট টিকেট", en: "Support Tickets", icon: HeadphonesIcon, path: "/portal/support", tint: "red", icons8: "online-support" },
];

// Single source-of-truth bottom nav (used on mobile + tablet, every page)
const bottomNav: { bn: string; en: string; icon: any; path: string; matchPrefix?: string; icons8?: string }[] = [
  { bn: "হোম",     en: "Home",     icon: Home,           path: "/portal/dashboard",                              icons8: "business" },
  { bn: "বিল",     en: "Bills",    icon: Receipt,        path: "/portal/bills",   matchPrefix: "/portal/bills", icons8: "documents" },
  { bn: "সাপোর্ট", en: "Support",  icon: HeadphonesIcon, path: "/portal/support",                                icons8: "online-support" },
  { bn: "লেজার",   en: "Ledger",   icon: BookOpen,       path: "/portal/ledger",                                 icons8: "address-book" },
  { bn: "প্রোফাইল", en: "Profile", icon: UserCog,        path: "/portal/profile",                                icons8: "manager" },
];

interface Props {
  children: React.ReactNode;
  /** When true, mobile main has no horizontal padding so per-page GradientHeader is full-bleed */
  fullBleedMobile?: boolean;
}

export const PortalLayout = ({ children, fullBleedMobile = true }: Props) => {
  const { customer, logout } = usePortalAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials =
    customer?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-background print:block print:min-h-0">
      {/* Sidebar — desktop persistent, mobile/tablet drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* User card */}
        <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-sidebar-primary/40">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{customer?.name || "Customer"}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[11px] text-success">{t("সাইন ইন", "Signed in")}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground/60 h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Nav with colorful icon tiles */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/70 font-bold">
            {t("নেভিগেশন", "Navigation")}
          </div>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition-all font-medium group",
                    active
                      ? "bg-sidebar-primary/10 text-sidebar-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <span
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform",
                      tintTile[item.tint],
                      active && "scale-105 shadow",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <span className="truncate">{t(item.bn, item.en)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-5 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
          {t("কাস্টমার পোর্টাল", "Customer Portal")} v1.0
        </div>
      </aside>

      {/* Drawer overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border flex items-center justify-between px-4 print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-semibold text-sm hidden sm:block">{t("কাস্টমার পোর্টাল", "Customer Portal")}</div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <HeaderClock />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-foreground hover:text-foreground"
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              title={t("ভাষা পরিবর্তন", "Change language")}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium">{lang === "bn" ? "EN" : "বাং"}</span>
            </Button>

            <Link to="/" target="_blank" title={t("ওয়েবসাইটে যান", "Visit website")}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{t("ওয়েবসাইট", "Website")}</span>
              </Button>
            </Link>

            <NotesButton ownerType="client" variant="compact" />
            <InstallAppButton variant="icon" />
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 px-2 py-1.5 rounded-lg hover:bg-muted">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium">{customer?.name || customer?.username}</span>
                    <span className="text-[10px] text-muted-foreground">{customer?.username}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{customer?.name || customer?.username}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{customer?.code || customer?.username}</div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/portal/profile" className="cursor-pointer">
                    <UserCog className="h-4 w-4 mr-2 text-blue-600" /> {t("আমার প্রোফাইল", "My Profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/portal/profile?tab=password" className="cursor-pointer">
                    <KeyRound className="h-4 w-4 mr-2 text-amber-600" /> {t("পাসওয়ার্ড পরিবর্তন", "Change Password")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" /> {t("লগআউট", "Logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 pb-24 lg:pb-6 overflow-auto print:p-0 print:pb-0 print:overflow-visible",
            fullBleedMobile ? "px-0 md:px-6 md:pt-6" : "p-4 md:p-6",
          )}
        >
          <InstallAppBanner className={cn(fullBleedMobile ? "mx-4 md:mx-0 mt-4 md:mt-0 mb-4" : "mb-4")} />
          {children}
        </main>

        {/* Bottom nav — mobile + tablet, single source of truth */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] print:hidden">
          <div className="grid grid-cols-5 max-w-md mx-auto">
            {bottomNav.map((item) => {
              const active = item.matchPrefix
                ? location.pathname.startsWith(item.matchPrefix)
                : location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10.5px] font-medium transition-colors min-h-[56px]",
                    active ? "text-rose-600" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={2.2} />
                  <span className="leading-none">{t(item.bn, item.en)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
