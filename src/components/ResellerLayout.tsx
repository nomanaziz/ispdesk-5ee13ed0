import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard, LogOut, Receipt, ShoppingCart, LifeBuoy, Users, Settings,
  Search, Menu, Activity, Server, Globe, ChevronDown, ChevronRight,
  Cog, MapPin, Box, Package, Layers, Briefcase, BadgeCheck, Cpu,
  UserPlus, ListChecks, Wallet, BarChart3, FileText, Calendar,
  MessageSquare, Send, Antenna, Radar, Wifi, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PermKey =
  | "dashboard" | "configuration" | "mikrotik" | "employee" | "client"
  | "billing" | "monitoring" | "sms" | "reports" | "purchases"
  | "tickets" | "system" | "fund_history" | "settings" | "users" | "invoices";

interface NavLink { to: string; label: string; icon: any }
interface NavGroup {
  key: PermKey;
  label: string;
  icon: any;
  items: NavLink[];
}

const groups: NavGroup[] = [
  {
    key: "dashboard", label: "Dashboard", icon: LayoutDashboard,
    items: [{ to: "/pop-admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    key: "configuration", label: "Configuration", icon: Cog,
    items: [
      { to: "/pop-admin/config/zones", label: "Zone", icon: MapPin },
      { to: "/pop-admin/config/sub-zones", label: "Sub Zone", icon: Layers },
      { to: "/pop-admin/config/boxes", label: "Box", icon: Box },
      { to: "/pop-admin/config/packages", label: "Package", icon: Package },
      { to: "/pop-admin/config/districts", label: "District", icon: MapPin },
      { to: "/pop-admin/config/upazilas", label: "Upazila", icon: MapPin },
      { to: "/pop-admin/config/departments", label: "Department", icon: Briefcase },
      { to: "/pop-admin/config/designations", label: "Designation", icon: BadgeCheck },
      { to: "/pop-admin/config/devices", label: "Device", icon: Cpu },
    ],
  },
  {
    key: "mikrotik", label: "MikroTik Client", icon: Server,
    items: [{ to: "/pop-admin/mikrotik-users", label: "MikroTik Users", icon: Server }],
  },
  {
    key: "employee", label: "Employee", icon: Users,
    items: [
      { to: "/pop-admin/employees/add", label: "Add Employee", icon: UserPlus },
      { to: "/pop-admin/employees", label: "Employee List", icon: Users },
      { to: "/pop-admin/employees/salary-sheet", label: "Salary Sheet", icon: FileText },
      { to: "/pop-admin/employees/payroll", label: "Payroll", icon: Wallet },
      { to: "/pop-admin/employees/attendance", label: "Attendance", icon: Calendar },
    ],
  },
  {
    key: "client", label: "Client", icon: Users,
    items: [
      { to: "/pop-admin/clients/add", label: "Add Client", icon: UserPlus },
      { to: "/pop-admin/clients", label: "Client List", icon: Users },
      { to: "/pop-admin/clients/billing", label: "Billing Client", icon: Receipt },
      { to: "/pop-admin/clients/left", label: "Left Clients", icon: Users },
      { to: "/pop-admin/clients/scheduler", label: "Scheduler", icon: Calendar },
    ],
  },
  {
    key: "billing", label: "Billing", icon: Receipt,
    items: [
      { to: "/pop-admin/billing/list", label: "Billing List", icon: Receipt },
      { to: "/pop-admin/billing/daily-collection", label: "Daily Collection", icon: Wallet },
    ],
  },
  {
    key: "monitoring", label: "Monitoring", icon: Antenna,
    items: [
      { to: "/pop-admin/monitoring/online", label: "Online Clients", icon: Wifi },
      { to: "/pop-admin/tickets", label: "Client Support", icon: LifeBuoy },
      { to: "/pop-admin/monitoring/ping", label: "Ping Tools", icon: Radar },
    ],
  },
  {
    key: "sms", label: "SMS Service", icon: MessageSquare,
    items: [
      { to: "/pop-admin/sms/templates", label: "Templates", icon: FileText },
      { to: "/pop-admin/sms/individual", label: "Individual / Group", icon: Users },
      { to: "/pop-admin/sms/send", label: "Send SMS", icon: Send },
      { to: "/pop-admin/sms/gateway", label: "Gateway", icon: Server },
    ],
  },
  {
    key: "reports", label: "Reports", icon: BarChart3,
    items: [
      { to: "/pop-admin/reports/bill-collection", label: "Bill Collection", icon: BarChart3 },
      { to: "/pop-admin/reports/enable-disable", label: "Enable/Disable", icon: BarChart3 },
      { to: "/pop-admin/reports/messages", label: "Messages", icon: BarChart3 },
      { to: "/pop-admin/reports/processing-fee", label: "Processing Fee", icon: BarChart3 },
      { to: "/pop-admin/reports/discount", label: "Discount", icon: BarChart3 },
      { to: "/pop-admin/reports/due-sms", label: "Due SMS", icon: BarChart3 },
    ],
  },
  {
    key: "purchases", label: "Purchase Orders", icon: ShoppingCart,
    items: [{ to: "/pop-admin/purchases", label: "Purchase Orders", icon: ShoppingCart }],
  },
  {
    key: "system", label: "System", icon: Settings,
    items: [
      { to: "/pop-admin/settings", label: "Company Settings", icon: Settings },
      { to: "/pop-admin/system/period", label: "Period", icon: Calendar },
      { to: "/pop-admin/users", label: "Users", icon: Users },
    ],
  },
  {
    key: "fund_history", label: "Fund History", icon: History,
    items: [
      { to: "/pop-admin/fund-history/credit", label: "Credit History", icon: History },
      { to: "/pop-admin/fund-history/debit", label: "Debit History", icon: History },
    ],
  },
];

// Map legacy permission keys (already issued by portal-auth) to new groups
function isGroupAllowed(g: NavGroup, customer: any): boolean {
  if (!customer) return false;
  const isBw = customer.type === "bw_customer";
  const isSub = customer.type === "reseller_sub";

  // BW customer hides POP-specific groups
  if (isBw) {
    return ["dashboard", "billing", "purchases", "tickets", "settings", "system"].includes(g.key);
  }

  // Reseller (full POP manager) — see everything
  if (!isSub) return true;

  // Sub-user — gated by permissions object
  const perms = customer.permissions || {};
  // Legacy keys map for backward compat
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
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    // Open the group containing the current route by default
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

  const visibleGroups = groups
    .filter((g) => isGroupAllowed(g, customer))
    .map((g) => ({
      ...g,
      // Sub-user: filter out items missing route-level permission
      items: g.items
        .filter((i) => !isSubUser || subPerms[i.to] !== false)
        .filter((i) =>
          !search || i.label.toLowerCase().includes(search.toLowerCase()),
        ),
    }))
    .filter((g) => g.items.length > 0)
    .filter((g) =>
      !search ||
      g.label.toLowerCase().includes(search.toLowerCase()) ||
      g.items.length > 0,
    );

  const popLabel = customer?.name?.toUpperCase() || "RESELLER PORTAL";
  const isSub = customer?.type === "reseller_sub";

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-40 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0 flex" : "-translate-x-full hidden md:flex",
        )}
      >
        <div className="h-14 px-4 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center">
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
              placeholder="Menu Search..."
              className="pl-8 h-9"
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
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
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
                      ? "text-sidebar-primary-foreground bg-sidebar-accent/50"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{g.label}</span>
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
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}
                        >
                          <ItemIcon className="h-3.5 w-3.5" />
                          {item.label}
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
            <LogOut className="h-4 w-4 mr-2" /> Logout
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
        <header className="h-14 border-b bg-card px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <div className="text-xs text-muted-foreground">POP Code</div>
              <div className="text-sm font-semibold">{customer?.code || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" target="_blank" title="ওয়েবসাইটে যান">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">ওয়েবসাইট</span>
              </Button>
            </Link>
            <div className="text-right">
              <div className="text-sm font-medium">{customer?.name}</div>
              <div className="text-xs text-muted-foreground">
                {customer?.username}
                {isSub ? " (Sub-user)" : ""}
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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
