import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Receipt, ShoppingCart, LifeBuoy, Settings, LogOut, Menu,
  Sparkles, Rocket, Search, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotesButton } from "@/components/notes/NotesButton";
import { InstallAppButton } from "@/components/InstallAppButton";
import { HeaderClock } from "@/components/HeaderClock";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import { resolveIcons8 } from "@/lib/iconResolver";
import ManageClientsUpgradeModal from "./ManageClientsUpgradeModal";
import { MobileBottomTabs } from "@/components/reseller/mobile/MobileBottomTabs";

interface NavItem {
  to: string;
  label: string;
  en: string;
  icon: any;
}

const navItems: NavItem[] = [
  { to: "/bw/dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard },
  { to: "/bw/invoices", label: "বিলিং ইনভয়েস", en: "Billing & Invoices", icon: Receipt },
  { to: "/bw/purchase-orders", label: "পার্চেজ অর্ডার", en: "Purchase Orders", icon: ShoppingCart },
  { to: "/bw/tickets", label: "সাপোর্ট টিকেট", en: "Support Tickets", icon: LifeBuoy },
  { to: "/bw/settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings },
];

export default function BwCustomerLayout({ children }: { children: ReactNode }) {
  const { customer, logout } = usePortalAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const panelActive = !!customer?.panel_access_enabled
    && customer?.panel_subscription_expires_at
    && customer.panel_subscription_expires_at > Date.now();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const labelOf = (i: NavItem) => (lang === "bn" ? i.label : i.en);

  const visibleItems = navItems.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.label.toLowerCase().includes(q) || i.en.toLowerCase().includes(q);
  });

  const popLabel = customer?.name?.toUpperCase() || (lang === "bn" ? "ব্যান্ডউইথ পোর্টাল" : "BANDWIDTH PORTAL");

  const SidebarBody = () => (
    <>
      <div className="h-[62px] px-4 flex items-center gap-2 border-b border-sidebar-border shrink-0">
        <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-sm truncate">{popLabel}</span>
      </div>

      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("মেনু খুঁজুন...", "Menu search...")}
            className="pl-8 h-9 bg-background/60 border-sidebar-border"
          />
        </div>
      </div>

      {/* Upgrade card */}
      <div className="p-3 border-b border-sidebar-border">
        {panelActive ? (
          <div className="rounded-lg border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              {t(`প্যানেল সক্রিয় (${customer?.panel_user_limit} ইউজার)`, `Panel active (${customer?.panel_user_limit} users)`)}
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate("/pop-admin/dashboard")}
            >
              <Rocket className="h-3.5 w-3.5" /> {t("POP Admin খুলুন", "Open POP Admin")}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="w-full rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-3 text-left transition-all hover:shadow-md hover:border-primary"
          >
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> Manage Your Clients
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("নিজের ক্লায়েন্ট ম্যানেজ করতে প্যানেল আনলক করুন", "Unlock the panel to manage your own clients")}
            </div>
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = location.pathname === item.to ||
            (item.to !== "/bw/dashboard" && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          const itemIcons8 = resolveIcons8({ url: item.to, title: item.en });
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {hasIcons8Icon(itemIcons8) ? (
                <Icons8Icon name={itemIcons8!} size={20} />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="truncate">{labelOf(item)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  // Mobile shell — same pattern as ResellerMobileShell
  const MobileLayout = () => (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 h-[62px] bg-primary text-primary-foreground px-3 flex items-center gap-2 shadow-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center font-bold text-sm shrink-0 active:scale-95 transition-transform"
              aria-label="User menu"
            >
              {customer?.name?.[0]?.toUpperCase() || "B"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="font-semibold leading-tight">{customer?.name}</span>
              <span className="text-xs font-normal text-muted-foreground leading-tight">
                {customer?.username}
              </span>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{customer?.code}</Badge>
                {panelActive && (
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 border">
                    PANEL
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/bw/settings">
                <Settings className="h-4 w-4 mr-2" />
                {t("সেটিংস", "Settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("লগআউট", "Logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate leading-tight">
            {customer?.name || "Bandwidth"}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-primary-foreground/80 leading-tight flex items-center gap-1">
            <span>{customer?.code || "BW"}</span>
            <span>·</span>
            <span>{t("ব্যান্ডউইথ ক্লায়েন্ট", "Bandwidth Client")}</span>
          </div>
        </div>

        {/* Language toggle */}
        <div
          className="inline-flex items-center rounded-full bg-primary-foreground/15 p-0.5 h-7"
          role="group"
          aria-label="Language"
        >
          <button
            type="button"
            onClick={() => setLang("bn")}
            className={cn(
              "px-2 h-6 rounded-full text-[10px] font-bold transition-colors",
              lang === "bn"
                ? "bg-primary-foreground text-primary"
                : "text-primary-foreground/80",
            )}
          >
            বাং
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={cn(
              "px-2 h-6 rounded-full text-[10px] font-bold transition-colors",
              lang === "en"
                ? "bg-primary-foreground text-primary"
                : "text-primary-foreground/80",
            )}
          >
            EN
          </button>
        </div>

        <div className="text-primary-foreground">
          <InstallAppButton variant="icon" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 p-3 pb-24 overflow-x-hidden">{children}</main>

      {/* Bottom tab bar — same pattern as POP Admin */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border h-16 grid grid-cols-5">
        {navItems.map((item) => {
          const active = location.pathname === item.to ||
            (item.to !== "/bw/dashboard" && location.pathname.startsWith(item.to));
          const Icon = item.icon;
          const itemIcons8 = resolveIcons8({ url: item.to, title: item.en });
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {hasIcons8Icon(itemIcons8) ? (
                <Icons8Icon name={itemIcons8!} size={22} />
              ) : (
                <Icon className="h-5 w-5" />
              )}
              <span className="truncate max-w-full px-1">{labelOf(item)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile drawer for full sidebar (search + upgrade card) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
            <SidebarBody />
          </aside>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <MobileLayout />
        <ManageClientsUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      </>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="sticky top-0 h-screen flex flex-col">
          <SidebarBody />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[62px] border-b border-border/40 bg-card/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("কাস্টমার কোড", "Customer Code")}
                </div>
                <div className="text-sm font-semibold">{customer?.code || "—"}</div>
              </div>
              {panelActive && (
                <Badge
                  variant="secondary"
                  className="uppercase text-[10px] tracking-wide font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                >
                  Panel · {customer?.panel_user_limit}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden lg:block">
              <HeaderClock />
            </div>
            <div
              className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 p-0.5 h-8"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={cn(
                  "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
                  lang === "bn"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
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
                  lang === "en"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="English"
              >
                EN
              </button>
            </div>
            <NotesButton ownerType="pop" />
            <InstallAppButton variant="icon" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full pl-2 pr-1 py-1 hover:bg-accent transition-colors"
                  aria-label="User menu"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium leading-tight">{customer?.name}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      {customer?.username}
                    </div>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                    {customer?.name?.[0]?.toUpperCase() || "B"}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight">{customer?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground leading-tight">
                    {customer?.username}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px]">{customer?.code}</Badge>
                    {panelActive && (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 border">
                        PANEL
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/bw/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    {t("সেটিংস", "Settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("লগআউট", "Logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>

      <ManageClientsUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
