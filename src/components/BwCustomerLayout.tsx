import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Receipt, ShoppingCart, LifeBuoy, Settings, LogOut, Menu,
  Sparkles, Search, Activity, Server, Users, UserPlus, FileSpreadsheet,
  Wallet, BarChart3, FileText, MessageSquare, Send, Wifi, TrendingUp,
  BookOpen, ChevronDown, ChevronRight, Rocket,
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
import ManageClientsUpgradeModal from "./ManageClientsUpgradeModal";

interface NavLink { to: string; label: string; en: string; icon: any; icons8?: string }
interface NavGroup { key: string; label: string; en: string; icon: any; icons8?: string; items: NavLink[]; panelOnly?: boolean }

// "Always" groups — shown to every BW customer (billing layer).
const baseGroups: NavGroup[] = [
  {
    key: "dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard, icons8: "business",
    items: [{ to: "/bw/dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard, icons8: "business" }],
  },
  {
    key: "billing", label: "বিলিং ইনভয়েস", en: "Billing & Invoices", icon: Receipt, icons8: "folder-invoices",
    items: [{ to: "/bw/invoices", label: "বিলিং ইনভয়েস", en: "Billing & Invoices", icon: Receipt, icons8: "folder-invoices" }],
  },
  {
    key: "service-orders", label: "সার্ভিস অর্ডার", en: "Service Orders", icon: ShoppingCart, icons8: "purchase-order",
    items: [{ to: "/bw/service-orders", label: "সার্ভিস অর্ডার", en: "Service Orders", icon: ShoppingCart, icons8: "purchase-order" }],
  },
  {
    key: "tickets", label: "সাপোর্ট টিকেট", en: "Support Tickets", icon: LifeBuoy, icons8: "online-support",
    items: [{ to: "/bw/tickets", label: "সাপোর্ট টিকেট", en: "Support Tickets", icon: LifeBuoy, icons8: "online-support" }],
  },
  {
    key: "settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings, icons8: "settings",
    items: [{ to: "/bw/settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings, icons8: "settings" }],
  },
];

// Panel groups — only visible while panel subscription is active.
const panelGroups: NavGroup[] = [
  {
    key: "mikrotik", label: "মাইক্রোটিক", en: "MikroTik", icon: Server, icons8: "router", panelOnly: true,
    items: [{ to: "/bw/panel/mikrotik", label: "MikroTik সার্ভার", en: "MikroTik Servers", icon: Server, icons8: "router" }],
  },
  {
    key: "client", label: "ক্লায়েন্ট", en: "Clients", icon: Users, icons8: "conference-call", panelOnly: true,
    items: [
      { to: "/bw/panel/clients/add", label: "ক্লায়েন্ট যোগ", en: "Add Client", icon: UserPlus },
      { to: "/bw/panel/clients", label: "ক্লায়েন্ট তালিকা", en: "Client List", icon: Users },
      { to: "/bw/panel/clients/bulk", label: "বাল্ক ইম্পোর্ট", en: "Bulk Import", icon: FileSpreadsheet },
    ],
  },
  {
    key: "panel-billing", label: "বিলিং", en: "Billing", icon: Receipt, icons8: "bill", panelOnly: true,
    items: [
      { to: "/bw/panel/billing", label: "বিলিং তালিকা", en: "Billing List", icon: Receipt },
      { to: "/bw/panel/billing/daily", label: "দৈনিক সংগ্রহ", en: "Daily Collection", icon: Wallet },
    ],
  },
  {
    key: "monitoring", label: "মনিটরিং", en: "Monitoring", icon: Wifi, icons8: "wifi-router", panelOnly: true,
    items: [{ to: "/bw/panel/monitoring/online", label: "অনলাইন ক্লায়েন্ট", en: "Online Clients", icon: Wifi }],
  },
  {
    key: "panel-tickets", label: "ক্লায়েন্ট টিকেট", en: "Client Tickets", icon: LifeBuoy, icons8: "online-support", panelOnly: true,
    items: [{ to: "/bw/panel/tickets", label: "ক্লায়েন্ট টিকেট", en: "Client Tickets", icon: LifeBuoy }],
  },
  {
    key: "sms", label: "এসএমএস", en: "SMS", icon: MessageSquare, icons8: "sms", panelOnly: true,
    items: [
      { to: "/bw/panel/sms/templates", label: "টেমপ্লেট", en: "Templates", icon: FileText },
      { to: "/bw/panel/sms/send", label: "এসএমএস পাঠান", en: "Send SMS", icon: Send },
      { to: "/bw/panel/sms/gateway", label: "গেটওয়ে", en: "Gateway", icon: Server },
    ],
  },
  {
    key: "employee", label: "কর্মচারী", en: "Employees", icon: Users, icons8: "manager", panelOnly: true,
    items: [
      { to: "/bw/panel/employees/add", label: "কর্মচারী যোগ", en: "Add Employee", icon: UserPlus },
      { to: "/bw/panel/employees", label: "কর্মচারী তালিকা", en: "Employee List", icon: Users },
    ],
  },
  {
    key: "accounting", label: "হিসাব", en: "Accounting", icon: Wallet, icons8: "accounting", panelOnly: true,
    items: [
      { to: "/bw/panel/accounting/income", label: "Income", en: "Income", icon: TrendingUp },
      { to: "/bw/panel/accounting/expense", label: "Expense", en: "Expense", icon: Wallet },
      { to: "/bw/panel/accounting/cashbook", label: "Cash Book", en: "Cash Book", icon: BookOpen },
    ],
  },
  {
    key: "reports", label: "রিপোর্ট", en: "Reports", icon: BarChart3, icons8: "combo-chart", panelOnly: true,
    items: [
      { to: "/bw/panel/reports/bill-collection", label: "বিল সংগ্রহ", en: "Bill Collection", icon: BarChart3 },
      { to: "/bw/panel/reports/customer", label: "কাস্টমার", en: "Customer", icon: BarChart3 },
      { to: "/bw/panel/reports/financial", label: "আর্থিক", en: "Financial", icon: BarChart3 },
    ],
  },
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

  const panelActive = !!customer?.panel_access_enabled
    && customer?.panel_subscription_expires_at
    && customer.panel_subscription_expires_at > Date.now();

  // Final group list — base + (panel groups when active)
  const allGroups = panelActive ? [...baseGroups, ...panelGroups] : baseGroups;

  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    for (const g of allGroups) {
      if (g.items.some((i) => location.pathname.startsWith(i.to))) return g.key;
    }
    return "dashboard";
  });

  useEffect(() => {
    const active = allGroups.find((g) => g.items.some((i) => location.pathname.startsWith(i.to)));
    if (active && active.key !== openGroup) setOpenGroup(active.key);
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, panelActive]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const labelOf = (i: { label: string; en: string }) => (lang === "bn" ? i.label : i.en);

  const visibleGroups = allGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return i.label.toLowerCase().includes(q) || i.en.toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.items.length > 0);

  const popLabel = customer?.name?.toUpperCase() || (lang === "bn" ? "ব্যান্ডউইথ পোর্টাল" : "BANDWIDTH PORTAL");
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

      {/* Panel status pill */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        {panelActive ? (
          <div className="rounded-lg border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              {t(`প্যানেল সক্রিয় (${customer?.panel_user_limit} ইউজার)`, `Panel active (${customer?.panel_user_limit} users)`)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t(`${daysLeft} দিন বাকি`, `${daysLeft} days left`)}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="w-full rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 text-left transition-all hover:shadow-md hover:border-primary"
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              {t("নিজস্ব প্যানেল আনলক করুন", "Activate Your Panel")}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t("ক্লায়েন্ট, MikroTik, বিলিং নিজে ম্যানেজ করুন", "Manage clients, MikroTik & billing yourself")}
            </div>
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleGroups.map((g) => {
          const Icon = g.icon;
          const isOpen = openGroup === g.key || !!search;
          const isSingle = g.items.length === 1;
          const groupActive = g.items.some((i) => location.pathname.startsWith(i.to));

          if (isSingle) {
            const item = g.items[0];
            const active = location.pathname === item.to ||
              (item.to !== "/bw/dashboard" && location.pathname.startsWith(item.to));
            const itemIcons8 = item.icons8 || g.icons8;
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
                {itemIcons8 && hasIcons8Icon(itemIcons8) ? <Icons8Icon name={itemIcons8} size={20} /> : <Icon className="h-4 w-4" />}
                <span className="truncate">{labelOf(g)}</span>
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
                {g.icons8 && hasIcons8Icon(g.icons8) ? <Icons8Icon name={g.icons8} size={20} /> : <Icon className="h-4 w-4" />}
                <span className="flex-1 text-left">{labelOf(g)}</span>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {isOpen && (
                <div className="ml-3 pl-3 border-l border-sidebar-border space-y-1 mt-1 mb-1">
                  {g.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = location.pathname === item.to ||
                      (item.to !== "/bw/dashboard" && location.pathname.startsWith(item.to));
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
                        {item.icons8 && hasIcons8Icon(item.icons8)
                          ? <Icons8Icon name={item.icons8} size={18} />
                          : <ItemIcon className="h-3.5 w-3.5" />}
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
    <>
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
              <div className="hidden lg:block"><HeaderClock /></div>
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
      </div>

      <ManageClientsUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
