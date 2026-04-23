import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Receipt, ShoppingCart, LifeBuoy, Settings, LogOut, Menu,
  Sparkles, Rocket, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ManageClientsUpgradeModal from "./ManageClientsUpgradeModal";

const navItems = [
  { to: "/bw/dashboard", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard },
  { to: "/bw/invoices", label: "বিলিং ইনভয়েস", en: "Billing & Invoices", icon: Receipt },
  { to: "/bw/purchase-orders", label: "পার্চেজ অর্ডার", en: "Purchase Orders", icon: ShoppingCart },
  { to: "/bw/tickets", label: "সাপোর্ট টিকেট", en: "Support Tickets", icon: LifeBuoy },
  { to: "/bw/settings", label: "কোম্পানি সেটিংস", en: "Company Settings", icon: Settings },
];

export default function BwCustomerLayout({ children }: { children: ReactNode }) {
  const { customer, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const panelActive = !!customer?.panel_access_enabled
    && customer?.panel_subscription_expires_at
    && customer.panel_subscription_expires_at > Date.now();

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-4 border-b">
        <div className="text-lg font-bold truncate">{customer?.name || "Bandwidth Customer"}</div>
        <div className="text-xs text-muted-foreground truncate">{customer?.code}</div>
      </div>

      {/* Upgrade card */}
      <div className="p-3">
        {panelActive ? (
          <div className="rounded-lg border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" /> প্যানেল সক্রিয় ({customer?.panel_user_limit} ইউজার)
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => navigate("/pop-admin/dashboard")}
            >
              <Rocket className="h-3.5 w-3.5" /> Open POP Admin
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
              নিজের ক্লায়েন্ট ম্যানেজ করতে প্যানেল আনলক করুন
            </div>
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <Button variant="outline" className="w-full gap-2" onClick={() => { logout(); navigate("/login"); }}>
          <LogOut className="h-4 w-4" /> লগআউট
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw]">
            <Sidebar />
            <button
              className="absolute top-4 right-4 p-1 rounded-md bg-card border"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2 border-b bg-card">
          <Button size="icon" variant="ghost" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-semibold truncate">{customer?.name}</div>
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <ManageClientsUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
