import { ReactNode, useState, useEffect, useMemo } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Receipt, ShoppingCart, LifeBuoy, Settings, LogOut, Menu,
  Sparkles, Search, Activity, Server, Users, UserPlus, FileSpreadsheet,
  Wallet, BarChart3, FileText, MessageSquare, Send, Wifi, TrendingUp,
  BookOpen, ChevronDown, ChevronRight, Rocket, Cog, MapPin, Box, Package,
  Layers, Briefcase, BadgeCheck, Cpu, Calendar, History, Building2, CreditCard,
  DollarSign, UserX, RefreshCw, Bell, Headphones, Cable, Shield, Tag, Wrench,
  Network, Monitor, ScrollText, Globe, List, Radio, ShieldCheck, FileBarChart,
  type LucideIcon,
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
import { MenuIconTile, tintForLabel, type Tint } from "@/components/sidebar/MenuIconTile";
import { ScrollArea } from "@/components/ui/scroll-area";
import ManageClientsUpgradeModal from "./ManageClientsUpgradeModal";

interface NavLinkItem { to: string; label: string; en: string; icon: LucideIcon }
interface NavGroup {
  key: string;
  label: string;
  en: string;
  icon: LucideIcon;
  tint: Tint;
  items: NavLinkItem[];
  panelOnly?: boolean;
}

const baseGroups: NavGroup[] = [
  {
    key: "dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard, tint: "indigo",
    items: [{ to: "/bw/dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard }],
  },
  {
    key: "billing", label: "বিলিং ইনভয়েস", en: "Billing & Invoices", icon: Receipt, tint: "violet",
    items: [{ to: "/bw/invoices", label: "বিলিং ইনভয়েস", en: "Billing & Invoices", icon: Receipt }],
  },
  {
    key: "service-orders", label: "সার্ভিস অর্ডার", en: "Service Orders", icon: ShoppingCart, tint: "orange",
    items: [{ to: "/bw/service-orders", label: "সার্ভিস অর্ডার", en: "Service Orders", icon: ShoppingCart }],
  },
  {
    key: "settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings, tint: "slate",
    items: [{ to: "/bw/settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings }],
  },
];

const panelGroups: NavGroup[] = [
  {
    key: "client", label: "ক্লায়েন্ট", en: "Clients", icon: Users, tint: "blue", panelOnly: true,
    items: [
      { to: "/bw/panel/clients/new-request", label: "নতুন রিকোয়েস্ট", en: "New Request", icon: MessageSquare },
      { to: "/bw/panel/clients/home", label: "হোম ক্লায়েন্ট", en: "Home Clients", icon: UserPlus },
      { to: "/bw/panel/clients/corporate", label: "কর্পোরেট ক্লায়েন্ট", en: "Corporate Clients", icon: Building2 },
      { to: "/bw/panel/billing", label: "বিলিং তালিকা", en: "Billing List", icon: CreditCard },
      { to: "/bw/panel/billing/daily", label: "দৈনিক বিল কালেকশন", en: "Daily Collection", icon: Wallet },
      { to: "/bw/panel/clients/installation-fee", label: "ইনস্টলেশন ফি", en: "Installation Fee", icon: DollarSign },
      { to: "/bw/panel/clients/left", label: "চলে যাওয়া ক্লায়েন্ট", en: "Left Clients", icon: UserX },
      { to: "/bw/panel/clients/scheduler", label: "শিডিউলার", en: "Scheduler", icon: Calendar },
      { to: "/bw/panel/clients/change-request", label: "পরিবর্তন রিকোয়েস্ট", en: "Change Request", icon: RefreshCw },
      { to: "/bw/panel/clients/add", label: "ক্লায়েন্ট যোগ", en: "Add Client", icon: UserPlus },
      { to: "/bw/panel/clients/bulk", label: "বাল্ক ইম্পোর্ট", en: "Bulk Import", icon: FileSpreadsheet },
      { to: "/bw/panel/clients", label: "ক্লায়েন্ট তালিকা", en: "Client List", icon: Users },
    ],
  },
  {
    key: "support", label: "নোটিশ", en: "Notices", icon: Bell, tint: "rose", panelOnly: true,
    items: [
      { to: "/bw/panel/support/notices", label: "নোটিশ", en: "Notices", icon: Bell },
    ],
  },
  {
    key: "accounting", label: "অ্যাকাউন্টিং", en: "Accounting", icon: Wallet, tint: "green", panelOnly: true,
    items: [
      { to: "/bw/panel/accounting/income", label: "আয়", en: "Income", icon: TrendingUp },
      { to: "/bw/panel/accounting/expense", label: "ব্যয়", en: "Expense", icon: Wallet },
      { to: "/bw/panel/accounting/cashbook", label: "ক্যাশ বুক", en: "Cash Book", icon: BookOpen },
    ],
  },
  {
    key: "employee", label: "HR", en: "HR", icon: Users, tint: "pink", panelOnly: true,
    items: [
      { to: "/bw/panel/employees/add", label: "কর্মচারী যোগ", en: "Add Employee", icon: UserPlus },
      { to: "/bw/panel/employees", label: "কর্মচারী তালিকা", en: "Employee List", icon: Users },
      { to: "/bw/panel/employees/salary-sheet", label: "বেতন শীট", en: "Salary Sheet", icon: FileText },
    ],
  },
  {
    key: "olt", label: "OLT ম্যানেজমেন্ট", en: "OLT Management", icon: Cpu, tint: "indigo", panelOnly: true,
    items: [
      { to: "/bw/panel/olt-overview", label: "OLT / ONU ওভারভিউ", en: "OLT / ONU Overview", icon: Cpu },
      { to: "/bw/panel/olt", label: "OLT ডিভাইস", en: "OLT Devices", icon: Server },
      { to: "/bw/panel/olt/power-dashboard", label: "OLT Power Dashboard", en: "OLT Power Dashboard", icon: Activity },
      { to: "/bw/panel/olt/onu", label: "ONU তালিকা", en: "ONU List", icon: List },
      { to: "/bw/panel/olt/users", label: "OLT ইউজার", en: "OLT Users", icon: Users },
      { to: "/bw/panel/olt/ports", label: "OLT Port Classification", en: "OLT Port Classification", icon: Network },
      { to: "/bw/panel/olt/user-down", label: "ইউজার ডাউন কাউন্ট", en: "User Down Count", icon: UserX },
      { to: "/bw/panel/olt/fiber-down", label: "ফাইবার ডাউন ফাইন্ডার", en: "Fiber Down Finder", icon: Cable },
      { to: "/bw/panel/olt/sharing", label: "OLT শেয়ারিং", en: "OLT Sharing", icon: Layers },
    ],
  },
  {
    key: "monitoring", label: "নেটওয়ার্ক মনিটরিং", en: "Network Monitoring", icon: Activity, tint: "teal", panelOnly: true,
    items: [
      { to: "/bw/panel/monitoring/online", label: "অনলাইন মনিটরিং", en: "Online Monitoring", icon: Wifi },
      { to: "/bw/panel/monitoring/live-traffic", label: "Live Traffic", en: "Live Traffic", icon: Activity },
      { to: "/bw/panel/network/switches", label: "Switch ম্যানেজমেন্ট", en: "Switch Management", icon: Network },
      { to: "/bw/panel/monitoring/pop-dass", label: "POP DASS", en: "POP DASS", icon: Monitor },
      { to: "/bw/panel/monitoring/pop-ip", label: "POP IP", en: "POP IP", icon: Globe },
      { to: "/bw/panel/monitoring/pop-log", label: "POP লগ", en: "POP Log", icon: ScrollText },
      { to: "/bw/panel/monitoring/ping-tools", label: "Ping টুলস", en: "Ping Tools", icon: Wifi },
      { to: "/bw/panel/monitoring/pop-devices", label: "POP ডিভাইস", en: "POP Devices", icon: Radio },
    ],
  },
  {
    key: "device", label: "ডিভাইস", en: "Device", icon: ShieldCheck, tint: "emerald", panelOnly: true,
    items: [
      { to: "/bw/panel/device-admin", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard },
      { to: "/bw/panel/device-admin/devices", label: "ডিভাইস ইনভেন্টরি", en: "Device Inventory", icon: Server },
      { to: "/bw/panel/mikrotik", label: "MikroTik PPPoE", en: "MikroTik PPPoE", icon: Server },
      { to: "/bw/panel/mikrotik-users", label: "MikroTik ইউজার", en: "MikroTik Users", icon: Users },
    ],
  },
  {
    key: "reports", label: "রিপোর্ট", en: "Reports", icon: FileBarChart, tint: "blue", panelOnly: true,
    items: [
      { to: "/bw/panel/reports/bill-collection", label: "বিল কালেকশন", en: "Bill Collection", icon: BarChart3 },
      { to: "/bw/panel/reports/customer", label: "কাস্টমার রিপোর্ট", en: "Customer", icon: BarChart3 },
      { to: "/bw/panel/reports/financial", label: "আর্থিক", en: "Financial", icon: BarChart3 },
    ],
  },
  {
    key: "sms", label: "SMS সার্ভিস", en: "SMS Service", icon: Send, tint: "sky", panelOnly: true,
    items: [
      { to: "/bw/panel/sms/templates", label: "টেমপ্লেট", en: "Templates", icon: FileText },
      { to: "/bw/panel/sms/send", label: "এসএমএস পাঠান", en: "Send SMS", icon: Send },
      { to: "/bw/panel/sms/gateway", label: "গেটওয়ে", en: "Gateway", icon: Server },
    ],
  },
  {
    key: "configuration", label: "কনফিগারেশন", en: "Configuration", icon: Settings, tint: "slate", panelOnly: true,
    items: [
      { to: "/bw/panel/config/zones", label: "জোন", en: "Zone", icon: MapPin },
      { to: "/bw/panel/config/sub-zones", label: "সাব জোন", en: "Sub Zone", icon: Layers },
      { to: "/bw/panel/config/boxes", label: "বক্স", en: "Box", icon: Box },
      { to: "/bw/panel/config/connection-types", label: "কানেকশন টাইপ", en: "Connection Type", icon: Cable },
      { to: "/bw/panel/config/client-types", label: "ক্লায়েন্ট টাইপ", en: "Client Type", icon: Users },
      { to: "/bw/panel/config/protocol-types", label: "প্রোটোকল টাইপ", en: "Protocol Type", icon: Shield },
      { to: "/bw/panel/config/billing-statuses", label: "বিলিং স্ট্যাটাস", en: "Billing Status", icon: Tag },
      { to: "/bw/panel/config/packages", label: "প্যাকেজ", en: "Package", icon: Package },
      { to: "/bw/panel/config/locations", label: "এলাকা (বিভাগ/জেলা/উপজেলা)", en: "Locations", icon: MapPin },
      { to: "/bw/panel/config/service-types", label: "সার্ভিস টাইপ", en: "Service Type", icon: Wrench },
      { to: "/bw/panel/config/departments", label: "বিভাগ", en: "Department", icon: Briefcase },
      { to: "/bw/panel/config/designations", label: "পদবী", en: "Designation", icon: BadgeCheck },
      { to: "/bw/panel/config/devices", label: "ডিভাইস টাইপ", en: "Device Type", icon: Cpu },
    ],
  },
];

// Match active route precisely. For sub-items we match exact path so that
// /bw/panel/clients/add doesn't also activate /bw/panel/clients.
const isPathActive = (currentPath: string, target: string) => {
  if (target === "/bw/dashboard") return currentPath === target;
  return currentPath === target || currentPath.startsWith(target + "/");
};

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

  const allGroups = useMemo(
    () => (panelActive ? [...baseGroups, ...panelGroups] : baseGroups),
    [panelActive],
  );

  // Find which group contains the active route — used for default open state.
  const activeGroupKey = useMemo(() => {
    const found = allGroups.find((g) =>
      g.items.some((i) => isPathActive(location.pathname, i.to)),
    );
    return found?.key ?? "dashboard";
  }, [location.pathname, allGroups]);

  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupKey);

  useEffect(() => {
    setOpenGroup(activeGroupKey);
    setMobileOpen(false);
  }, [activeGroupKey]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const labelOf = (i: { label: string; en: string }) => (lang === "bn" ? i.label : i.en);

  const visibleGroups = useMemo(() => {
    if (!search.trim()) return allGroups;
    const q = search.toLowerCase();
    return allGroups
      .map((g) => {
        const groupMatch = g.label.toLowerCase().includes(q) || g.en.toLowerCase().includes(q);
        const items = groupMatch
          ? g.items
          : g.items.filter((i) => i.label.toLowerCase().includes(q) || i.en.toLowerCase().includes(q));
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [allGroups, search]);

  const popLabel = customer?.name?.toUpperCase() || (lang === "bn" ? "ব্যান্ডউইথ পোর্টাল" : "BANDWIDTH PORTAL");
  const expiresAt = customer?.panel_subscription_expires_at;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : 0;

  const SidebarBody = () => (
    <>
      {/* Brand */}
      <div className="h-[62px] px-4 flex items-center gap-2 border-b border-sidebar-border shrink-0">
        <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-sm truncate">{popLabel}</span>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("মেনু খুঁজুন...", "Search menu...")}
            className="pl-8 h-8 text-[12px] bg-background/60 border-sidebar-border"
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

      {/* Menu — main-portal pattern */}
      <ScrollArea className="flex-1">
        <nav className="py-2 space-y-0.5">
          {visibleGroups.map((g) => {
            const isOpen = openGroup === g.key || !!search.trim();
            const isSingle = g.items.length === 1;
            const groupActive = g.items.some((i) => isPathActive(location.pathname, i.to));

            // Single-link group renders as a direct nav row.
            if (isSingle) {
              const item = g.items[0];
              const active = isPathActive(location.pathname, item.to);
              return (
                <div key={g.key} className="px-2">
                  <NavLink
                    to={item.to}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 text-[13px] font-semibold rounded-lg uppercase tracking-wider transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-sidebar-primary-foreground/80"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <MenuIconTile icon={g.icon} tint={g.tint} active={active} />
                    <span className="flex-1 truncate">{labelOf(g)}</span>
                  </NavLink>
                </div>
              );
            }

            // Collapsible group with submenu items.
            return (
              <div key={g.key} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => setOpenGroup((p) => (p === g.key ? null : g.key))}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-3 py-2 text-[13px] font-semibold rounded-lg mx-2 uppercase tracking-wider transition-colors",
                    groupActive
                      ? "text-sidebar-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                  style={{ width: "calc(100% - 16px)" }}
                >
                  <MenuIconTile icon={g.icon} tint={g.tint} active={groupActive} />
                  <span className="flex-1 text-left truncate">{labelOf(g)}</span>
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  ) : (
                    <ChevronRight className="h-3 w-3 opacity-60" />
                  )}
                </button>
                {isOpen && (
                  <div className="relative ml-7 mr-2 mt-1 mb-1 pl-4 border-l border-sidebar-border/70 space-y-0.5">
                    {g.items.map((item) => {
                      const active = isPathActive(location.pathname, item.to);
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end
                          className={cn(
                            "group/sub relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-md transition-colors",
                            "before:absolute before:left-[-16px] before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-px before:bg-sidebar-border/70",
                            active
                              ? "bg-sidebar-accent text-sidebar-foreground font-semibold after:absolute after:left-[-17px] after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-full after:bg-sidebar-primary before:bg-sidebar-primary"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-70")} strokeWidth={2} />
                          <span className="flex-1 truncate">{labelOf(item)}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {visibleGroups.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              {t("কোনো মেনু পাওয়া যায়নি", "No menu found")}
            </div>
          )}
        </nav>
      </ScrollArea>
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
