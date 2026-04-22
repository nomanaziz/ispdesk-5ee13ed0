import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, LogOut, Receipt, ShoppingCart, LifeBuoy, Users, Settings,
  Search, Menu, Activity, Server, Globe, ChevronDown, ChevronRight,
  Cog, MapPin, Box, Package, Layers, Briefcase, BadgeCheck, Cpu,
  UserPlus, Wallet, BarChart3, FileText, Calendar,
  MessageSquare, Send, Antenna, Radar, Wifi, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PermKey =
  | "dashboard" | "configuration" | "mikrotik" | "employee" | "client"
  | "billing" | "monitoring" | "sms" | "reports" | "purchases"
  | "tickets" | "system" | "fund_history" | "settings" | "users" | "invoices";

interface NavLink { to: string; label: string; en: string; icon: any }
interface NavGroup {
  key: PermKey;
  label: string;
  en: string;
  icon: any;
  items: NavLink[];
}

const groups: NavGroup[] = [
  {
    key: "dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard,
    items: [{ to: "/pop-admin/dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard }],
  },
  {
    key: "configuration", label: "কনফিগারেশন", en: "Configuration", icon: Cog,
    items: [
      { to: "/pop-admin/config/zones", label: "জোন", en: "Zone", icon: MapPin },
      { to: "/pop-admin/config/sub-zones", label: "সাব জোন", en: "Sub Zone", icon: Layers },
      { to: "/pop-admin/config/boxes", label: "বক্স", en: "Box", icon: Box },
      { to: "/pop-admin/config/packages", label: "প্যাকেজ", en: "Package", icon: Package },
      { to: "/pop-admin/config/districts", label: "জেলা", en: "District", icon: MapPin },
      { to: "/pop-admin/config/upazilas", label: "উপজেলা", en: "Upazila", icon: MapPin },
      { to: "/pop-admin/config/departments", label: "বিভাগ", en: "Department", icon: Briefcase },
      { to: "/pop-admin/config/designations", label: "পদবী", en: "Designation", icon: BadgeCheck },
      { to: "/pop-admin/config/devices", label: "ডিভাইস", en: "Device", icon: Cpu },
    ],
  },
  {
    key: "mikrotik", label: "মাইক্রোটিক ক্লায়েন্ট", en: "MikroTik Client", icon: Server,
    items: [{ to: "/pop-admin/mikrotik-users", label: "মাইক্রোটিক ইউজার", en: "MikroTik Users", icon: Server }],
  },
  {
    key: "employee", label: "কর্মচারী", en: "Employee", icon: Users,
    items: [
      { to: "/pop-admin/employees/add", label: "কর্মচারী যোগ", en: "Add Employee", icon: UserPlus },
      { to: "/pop-admin/employees", label: "কর্মচারী তালিকা", en: "Employee List", icon: Users },
      { to: "/pop-admin/employees/salary-sheet", label: "বেতন শীট", en: "Salary Sheet", icon: FileText },
      { to: "/pop-admin/employees/payroll", label: "পে-রোল", en: "Payroll", icon: Wallet },
      { to: "/pop-admin/employees/attendance", label: "উপস্থিতি", en: "Attendance", icon: Calendar },
    ],
  },
  {
    key: "client", label: "ক্লায়েন্ট", en: "Client", icon: Users,
    items: [
      { to: "/pop-admin/clients/add", label: "ক্লায়েন্ট যোগ", en: "Add Client", icon: UserPlus },
      { to: "/pop-admin/clients", label: "ক্লায়েন্ট তালিকা", en: "Client List", icon: Users },
      { to: "/pop-admin/billing/list", label: "বিলিং তালিকা", en: "Billing List", icon: Receipt },
      { to: "/pop-admin/billing/daily-collection", label: "দৈনিক সংগ্রহ", en: "Daily Collection", icon: Wallet },
      { to: "/pop-admin/clients/left", label: "চলে যাওয়া ক্লায়েন্ট", en: "Left Clients", icon: Users },
      { to: "/pop-admin/clients/scheduler", label: "শিডিউলার", en: "Scheduler", icon: Calendar },
    ],
  },
  {
    key: "monitoring", label: "মনিটরিং", en: "Monitoring", icon: Antenna,
    items: [
      { to: "/pop-admin/monitoring/online", label: "অনলাইন ক্লায়েন্ট", en: "Online Clients", icon: Wifi },
      { to: "/pop-admin/tickets", label: "ক্লায়েন্ট সাপোর্ট", en: "Client Support", icon: LifeBuoy },
      { to: "/pop-admin/monitoring/ping", label: "পিং টুলস", en: "Ping Tools", icon: Radar },
    ],
  },
  {
    key: "sms", label: "এসএমএস সার্ভিস", en: "SMS Service", icon: MessageSquare,
    items: [
      { to: "/pop-admin/sms/templates", label: "টেমপ্লেট", en: "Templates", icon: FileText },
      { to: "/pop-admin/sms/individual", label: "ইন্ডিভিজুয়াল / গ্রুপ", en: "Individual / Group", icon: Users },
      { to: "/pop-admin/sms/send", label: "এসএমএস পাঠান", en: "Send SMS", icon: Send },
      { to: "/pop-admin/sms/gateway", label: "গেটওয়ে", en: "Gateway", icon: Server },
    ],
  },
  {
    key: "reports", label: "রিপোর্ট", en: "Reports", icon: BarChart3,
    items: [
      { to: "/pop-admin/reports/bill-collection", label: "বিল সংগ্রহ", en: "Bill Collection", icon: BarChart3 },
      { to: "/pop-admin/reports/enable-disable", label: "চালু/বন্ধ", en: "Enable/Disable", icon: BarChart3 },
      { to: "/pop-admin/reports/messages", label: "মেসেজ", en: "Messages", icon: BarChart3 },
      { to: "/pop-admin/reports/processing-fee", label: "প্রসেসিং ফি", en: "Processing Fee", icon: BarChart3 },
      { to: "/pop-admin/reports/discount", label: "ডিসকাউন্ট", en: "Discount", icon: BarChart3 },
      { to: "/pop-admin/reports/due-sms", label: "ডিউ এসএমএস", en: "Due SMS", icon: BarChart3 },
    ],
  },
  {
    key: "purchases", label: "ক্রয় অর্ডার", en: "Purchase Orders", icon: ShoppingCart,
    items: [{ to: "/pop-admin/purchases", label: "ক্রয় অর্ডার", en: "Purchase Orders", icon: ShoppingCart }],
  },
  {
    key: "system", label: "সিস্টেম", en: "System", icon: Settings,
    items: [
      { to: "/pop-admin/system/setup", label: "সিস্টেম সেটআপ", en: "System Setup", icon: Cog },
      { to: "/pop-admin/system/bill-period", label: "বিল পিরিয়ড", en: "Bill Period", icon: Calendar },
      { to: "/pop-admin/system/period", label: "পিরিয়ড সেটআপ", en: "Period Setup", icon: Calendar },
      { to: "/pop-admin/settings", label: "কোম্পানি সেটআপ", en: "Company Settings", icon: Settings },
      { to: "/pop-admin/system/invoice", label: "ইনভয়েস সেটআপ", en: "Invoice Setup", icon: FileText },
      { to: "/pop-admin/system/email", label: "ইমেইল সেটআপ", en: "Email Setup", icon: MessageSquare },
      { to: "/pop-admin/system/payment-gateways", label: "পেমেন্ট গেটওয়ে", en: "Payment Gateways", icon: Wallet },
      { to: "/pop-admin/system/processing-fee", label: "প্রসেসিং ফি", en: "Processing Fee", icon: Wallet },
      { to: "/pop-admin/system/automatic-process", label: "অটোমেটিক প্রসেস", en: "Automatic Process", icon: Activity },
      { to: "/pop-admin/system/activity-log", label: "অ্যাক্টিভিটি লগ", en: "Activity Log", icon: History },
    ],
  },
  {
    key: "fund_history", label: "ফান্ড হিস্ট্রি", en: "Fund History", icon: History,
    items: [
      { to: "/pop-admin/fund-history/credit", label: "ক্রেডিট হিস্ট্রি", en: "Credit History", icon: History },
      { to: "/pop-admin/fund-history/debit", label: "ডেবিট হিস্ট্রি", en: "Debit History", icon: History },
    ],
  },
];

function isGroupAllowed(g: NavGroup, customer: any): boolean {
  if (!customer) return false;
  const isBw = customer.type === "bw_customer";
  const isSub = customer.type === "reseller_sub";

  if (isBw) {
    return ["dashboard", "billing", "purchases", "tickets", "settings", "system"].includes(g.key);
  }

  if (!isSub) return true;

  const perms = customer.permissions || {};
  const legacyMap: Record<string, string[]> = {
    dashboard: ["dashboard"],
    configuration: ["configuration", "settings"],
    mikrotik: ["mikrotik", "dashboard"],
    employee: ["employee", "users"],
    client: ["client", "dashboard"],
    billing: ["billing", "invoices"],
    monitoring: ["monitoring", "tickets"],
    sms: ["sms"],
    reports: ["reports"],
    purchases: ["purchases"],
    tickets: ["tickets"],
    system: ["system", "settings"],
    fund_history: ["fund_history", "settings"],
  };
  return (legacyMap[g.key] || [g.key]).some((k) => perms[k]);
}

export const ResellerLayout = ({ children }: { children: ReactNode }) => {
  const { customer, logout } = usePortalAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const g of groups) {
      if (g.items.some((i) => location.pathname.startsWith(i.to))) set.add(g.key);
    }
    if (set.size === 0) set.add("dashboard");
    return set;
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleGroup = (k: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const isSubUser = customer?.type === "reseller_sub";
  const subPerms: Record<string, boolean> = (customer?.permissions as any) || {};

  const labelOf = (g: { label: string; en: string }) => (lang === "bn" ? g.label : g.en);

  const visibleGroups = groups
    .filter((g) => isGroupAllowed(g, customer))
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => !isSubUser || subPerms[i.to] !== false)
        .filter((i) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            i.label.toLowerCase().includes(q) ||
            i.en.toLowerCase().includes(q)
          );
        }),
    }))
    .filter((g) => g.items.length > 0)
    .filter((g) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        g.label.toLowerCase().includes(q) ||
        g.en.toLowerCase().includes(q) ||
        g.items.length > 0
      );
    });

  const popLabel = customer?.name?.toUpperCase() || (lang === "bn" ? "রিসেলার পোর্টাল" : "RESELLER PORTAL");
  const isSub = customer?.type === "reseller_sub";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0 flex" : "-translate-x-full hidden md:flex",
        )}
      >
        <div className="h-[62px] px-4 flex items-center gap-2 border-b border-sidebar-border">
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

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleGroups.map((g) => {
            const Icon = g.icon;
            const isOpen = openGroups.has(g.key) || !!search;
            const isSingle = g.items.length === 1 && g.items[0].label === g.label;
            const groupActive = g.items.some((i) => location.pathname.startsWith(i.to));

            if (isSingle) {
              const item = g.items[0];
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={g.key}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {labelOf(item)}
                </Link>
              );
            }

            return (
              <div key={g.key}>
                <button
                  onClick={() => toggleGroup(g.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    groupActive
                      ? "text-sidebar-foreground bg-sidebar-accent/60"
                      : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{labelOf(g)}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {isOpen && (
                  <div className="ml-3 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5 mb-1">
                    {g.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = location.pathname === item.to ||
                        (item.to !== "/pop-admin/dashboard" && location.pathname.startsWith(item.to));
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                            active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <ItemIcon className="h-3.5 w-3.5" />
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

        <div className="p-3 border-t border-sidebar-border">
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> {t("লগআউট", "Logout")}
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
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
            <div className="hidden sm:block">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("পপ কোড", "POP Code")}
              </div>
              <div className="text-sm font-semibold">{customer?.code || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Language Toggle */}
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
            <Link to="/" target="_blank" title={t("ওয়েবসাইটে যান", "Open website")}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </Link>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{customer?.name}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">
                {customer?.username}
                {isSub ? (lang === "bn" ? " (সাব-ইউজার)" : " (Sub-user)") : ""}
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
              {customer?.name?.[0]?.toUpperCase() || "R"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default ResellerLayout;
