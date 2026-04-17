import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  LogOut,
  Receipt,
  ShoppingCart,
  LifeBuoy,
  Users,
  Settings,
  Search,
  Menu,
  Activity,
  Server,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Key = "dashboard" | "invoices" | "purchases" | "tickets" | "users" | "settings" | "mikrotik";

const allNav: { key: Key; to: string; label: string; icon: any }[] = [
  { key: "dashboard", to: "/reseller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "mikrotik", to: "/reseller/mikrotik-users", label: "MikroTik Users", icon: Server },
  { key: "invoices", to: "/reseller/invoices", label: "Billing Invoices", icon: Receipt },
  { key: "purchases", to: "/reseller/purchases", label: "Purchase Orders", icon: ShoppingCart },
  { key: "tickets", to: "/reseller/tickets", label: "Support Tickets", icon: LifeBuoy },
  { key: "users", to: "/reseller/users", label: "User Management", icon: Users },
  { key: "settings", to: "/reseller/settings", label: "Company Settings", icon: Settings },
];

export const ResellerLayout = ({ children }: { children: ReactNode }) => {
  const { customer, logout } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  // Sub-user permission filtering
  const isSub = customer?.type === "reseller_sub";
  const isBwCustomer = customer?.type === "bw_customer";
  const perms = customer?.permissions;
  const nav = allNav
    .filter((item) => (isBwCustomer ? item.key !== "users" && item.key !== "mikrotik" : true))
    .filter((item) => (isSub && perms && item.key !== "mikrotik" ? perms[item.key as keyof typeof perms] : true))
    .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()));

  const popLabel = customer?.name?.toUpperCase() || "RESELLER PORTAL";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
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
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
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
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default ResellerLayout;
