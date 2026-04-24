import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, LogOut, Receipt, LifeBuoy, Users, Settings,
  Search, Menu, Activity, Server, ChevronDown, ChevronRight,
  UserPlus, Wallet, BarChart3, FileText,
  MessageSquare, Send, Wifi, TrendingUp, BookOpen, FileSpreadsheet,
  ArrowLeft, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { InstallAppButton } from "@/components/InstallAppButton";
import { HeaderClock } from "@/components/HeaderClock";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";
import { resolveIcons8 } from "@/lib/iconResolver";

interface NavLink { to: string; label: string; en: string; icon: any }
interface NavGroup { key: string; label: string; en: string; icon: any; items: NavLink[] }

const groups: NavGroup[] = [
  {
    key: "dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard,
    items: [
      { to: "/bw-panel/dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    key: "mikrotik", label: "মাইক্রোটিক", en: "MikroTik", icon: Server,
    items: [
      { to: "/bw-panel/mikrotik", label: "MikroTik সার্ভার", en: "MikroTik Servers", icon: Server },
    ],
  },
  {
    key: "client", label: "ক্লায়েন্ট", en: "Client", icon: Users,
    items: [
      { to: "/bw-panel/clients/add", label: "ক্লায়েন্ট যোগ", en: "Add Client", icon: UserPlus },
      { to: "/bw-panel/clients", label: "ক্লায়েন্ট তালিকা", en: "Client List", icon: Users },
      { to: "/bw-panel/clients/bulk", label: "বাল্ক ইম্পোর্ট", en: "Bulk Import", icon: FileSpreadsheet },
    ],
  },
  {
    key: "billing", label: "বিলিং", en: "Billing", icon: Receipt,
    items: [
      { to: "/bw-panel/billing", label: "বিলিং তালিকা", en: "Billing List", icon: Receipt },
      { to: "/bw-panel/billing/daily", label: "দৈনিক সংগ্রহ", en: "Daily Collection", icon: Wallet },
    ],
  },
  {
    key: "monitoring", label: "মনিটরিং", en: "Monitoring", icon: Wifi,
    items: [
      { to: "/bw-panel/monitoring/online", label: "অনলাইন ক্লায়েন্ট", en: "Online Clients", icon: Wifi },
    ],
  },
  {
    key: "tickets", label: "সাপোর্ট টিকেট", en: "Support Tickets", icon: LifeBuoy,
    items: [
      { to: "/bw-panel/tickets", label: "ক্লায়েন্ট টিকেট", en: "Client Tickets", icon: LifeBuoy },
    ],
  },
  {
    key: "sms", label: "এসএমএস", en: "SMS", icon: MessageSquare,
    items: [
      { to: "/bw-panel/sms/templates", label: "টেমপ্লেট", en: "Templates", icon: FileText },
      { to: "/bw-panel/sms/send", label: "এসএমএস পাঠান", en: "Send SMS", icon: Send },
      { to: "/bw-panel/sms/gateway", label: "গেটওয়ে", en: "Gateway", icon: Server },
    ],
  },
  {
    key: "employee", label: "কর্মচারী", en: "Employee", icon: Users,
    items: [
      { to: "/bw-panel/employees/add", label: "কর্মচারী যোগ", en: "Add Employee", icon: UserPlus },
      { to: "/bw-panel/employees", label: "কর্মচারী তালিকা", en: "Employee List", icon: Users },
    ],
  },
  {
    key: "accounting", label: "হিসাব", en: "Accounting", icon: Wallet,
    items: [
      { to: "/bw-panel/accounting/income", label: "Income", en: "Income", icon: TrendingUp as any },
      { to: "/bw-panel/accounting/expense", label: "Expense", en: "Expense", icon: Wallet },
      { to: "/bw-panel/accounting/cashbook", label: "Cash Book", en: "Cash Book", icon: BookOpen as any },
    ],
  },
  {
    key: "reports", label: "রিপোর্ট", en: "Reports", icon: BarChart3,
    items: [
      { to: "/bw-panel/reports/bill-collection", label: "বিল সংগ্রহ", en: "Bill Collection", icon: BarChart3 },
      { to: "/bw-panel/reports/customer", label: "কাস্টমার", en: "Customer", icon: BarChart3 },
      { to: "/bw-panel/reports/financial", label: "আর্থিক", en: "Financial", icon: BarChart3 },
    ],
  },
  {
    key: "settings", label: "সেটিংস", en: "Settings", icon: Settings,
    items: [
      { to: "/bw-panel/settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings },
    ],
  },
];

export default function BwPanelLayout({ children }: { children: ReactNode }) {
  const { customer, logout } = usePortalAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    for (const g of groups) {
      if (g.items.some((i) => location.pathname.startsWith(i.to))) return g.key;
    }
    return "dashboard";
  });

  useEffect(() => {
    const active = groups.find((g) => g.items.some((i) => location.pathname.startsWith(i.to)));
    if (active && active.key !== openGroup) setOpenGroup(active.key);
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const labelOf = (g: { label: string; en: string }) => (lang === "bn" ? g.label : g.en);

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return i.label.toLowerCase().includes(q) || i.en.toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.items.length > 0);

  const popLabel = customer?.name?.toUpperCase() || (lang === "bn" ? "আমার প্যানেল" : "MY PANEL");
  const expiresAt = customer?.panel_subscription_expires_at;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : 0;

  const SidebarBody = () => (
    <>
      <div className="h-[62px] px-4 flex items-center gap-2 border-b border-sidebar-border shrink-0">
        <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-sm truncate">{popLabel}</span>
      </div>

      {/* Back to Billing pill */}
      <div className="px-3 pt-3">
        <Link
          to="/bw/dashboard"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("← অ্যাডমিন বিলিং-এ ফিরুন", "← Back to Billing")}
        </Link>
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

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleGroups.map((g) => {
          const Icon = g.icon;
          const isOpen = openGroup === g.key || !!search;
          const isSingle = g.items.length === 1;
          const groupActive = g.items.some((i) => location.pathname.startsWith(i.to));
          const groupIcons8 = resolveIcons8({ label: g.label });

          if (isSingle) {
            const item = g.items[0];
            const active = location.pathname === item.to ||
              (item.to !== "/bw-panel/dashboard" && location.pathname.startsWith(item.to));
            const itemIcons8 = resolveIcons8({ url: item.to, title: item.label });
            return (
              <Link
                key={g.key}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {hasIcons8Icon(itemIcons8) ? <Icons8Icon name={itemIcons8!} size={20} /> : <Icon className="h-4 w-4" />}
                {labelOf(g)}
              </Link>
            );
          }

          return (
            <div key={g.key}>
              <button
                onClick={() => setOpenGroup((p) => (p === g.key ? null : g.key))}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  groupActive
                    ? "text-sidebar-foreground bg-sidebar-accent/60"
                    : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                {hasIcons8Icon(groupIcons8) ? <Icons8Icon name={groupIcons8!} size={20} /> : <Icon className="h-4 w-4" />}
                <span className="flex-1 text-left">{labelOf(g)}</span>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {isOpen && (
                <div className="ml-3 pl-3 border-l border-sidebar-border space-y-1 mt-1 mb-1">
                  {g.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = location.pathname === item.to ||
                      (item.to !== "/bw-panel/dashboard" && location.pathname.startsWith(item.to));
                    const itemIcons8 = resolveIcons8({ url: item.to, title: item.label });
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm border-sidebar-primary"
                            : "bg-sidebar-accent/30 border-sidebar-border/60 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:border-sidebar-border",
                        )}
                      >
                        {hasIcons8Icon(itemIcons8) ? <Icons8Icon name={itemIcons8!} size={18} /> : <ItemIcon className="h-3.5 w-3.5" />}
                        {labelOf(item)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0 flex" : "-translate-x-full hidden md:flex",
        )}
      >
        <SidebarBody />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[62px] border-b border-border/40 bg-card/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 border gap-1">
              <Sparkles className="h-3 w-3" />
              {t(`আমার প্যানেল • ${customer?.panel_user_limit || 0} ইউজার • ${daysLeft} দিন বাকি`,
                 `My Panel • ${customer?.panel_user_limit || 0} users • ${daysLeft}d left`)}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden lg:block"><HeaderClock /></div>
            <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 p-0.5 h-8">
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={cn(
                  "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
                  lang === "bn" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >বাং</button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={cn(
                  "px-2.5 h-7 rounded-full text-[11px] font-semibold transition-colors",
                  lang === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >EN</button>
            </div>
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
                    <div className="text-[11px] text-muted-foreground leading-tight">{customer?.username}</div>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                    {customer?.name?.[0]?.toUpperCase() || "B"}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-semibold leading-tight">{customer?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground leading-tight">{customer?.username}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/bw/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("অ্যাডমিন বিলিং", "Admin Billing")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/bw-panel/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    {t("সেটিংস", "Settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("লগআউট", "Logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
