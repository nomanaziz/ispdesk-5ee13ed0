import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, FileText, HeadphonesIcon, LogOut, Menu, X,
  Activity, Bell, Building2, Clapperboard, BookOpen, ChevronDown, Rocket,
  ShoppingBag, Package, Receipt, Globe, UserCog,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/portal/dashboard", color: "text-indigo-600 dark:text-indigo-400" },
  { label: "My Profile", icon: UserCog, path: "/portal/profile", color: "text-blue-600 dark:text-blue-400" },
  { label: "Live Usage", icon: Activity, path: "/portal/live-usage", color: "text-green-600 dark:text-green-400" },
  { label: "Notices", icon: Bell, path: "/portal/notices", color: "text-amber-600 dark:text-amber-400" },
  { label: "Company Info", icon: Building2, path: "/portal/company", color: "text-slate-600 dark:text-slate-300" },
  { label: "Movie/FTP Servers", icon: Clapperboard, path: "/portal/media", color: "text-purple-600 dark:text-purple-400" },
  { label: "Speed Test", icon: Rocket, path: "/portal/speed-test", color: "text-rose-600 dark:text-rose-400" },
  { label: "My Ledger", icon: BookOpen, path: "/portal/ledger", color: "text-cyan-600 dark:text-cyan-400" },
  { label: "মাসিক বিল", icon: Receipt, path: "/portal/bills", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Invoices", icon: FileText, path: "/portal/invoices", color: "text-teal-600 dark:text-teal-400" },
  { label: "Shop", icon: ShoppingBag, path: "/portal/shop", color: "text-pink-600 dark:text-pink-400" },
  { label: "My Orders", icon: Package, path: "/portal/my-orders", color: "text-orange-600 dark:text-orange-400" },
  { label: "Support Tickets", icon: HeadphonesIcon, path: "/portal/support", color: "text-red-600 dark:text-red-400" },
];

const bottomNav = [
  { label: "Home", icon: LayoutDashboard, path: "/portal/dashboard", color: "text-indigo-600 dark:text-indigo-400" },
  { label: "Bills", icon: Receipt, path: "/portal/bills", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "Tickets", icon: HeadphonesIcon, path: "/portal/support", color: "text-red-600 dark:text-red-400" },
  { label: "Ledger", icon: BookOpen, path: "/portal/ledger", color: "text-cyan-600 dark:text-cyan-400" },
  { label: "Notices", icon: Bell, path: "/portal/notices", color: "text-amber-600 dark:text-amber-400" },
];

export const PortalLayout = ({ children }: { children: React.ReactNode }) => {
  const { customer, logout } = usePortalAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials =
    customer?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-background print:block print:min-h-0">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0 print:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                <span className="text-[11px] text-success">Signed in</span>
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/70 font-bold">
            Navigation
          </div>
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors font-medium",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", active ? "" : item.color)} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="px-2 pt-5 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/70 font-bold">
            Account
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>

        <div className="px-5 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
          Customer Portal v1.0
        </div>
      </aside>

      {/* Overlay */}
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
            <div className="font-semibold text-sm hidden sm:block">Customer Portal</div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" target="_blank" title="ওয়েবসাইটে যান">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">ওয়েবসাইট</span>
              </Button>
            </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 px-2 py-1.5 rounded-lg hover:bg-muted">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hidden sm:inline font-medium">{customer?.username}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto print:p-0 print:pb-0 print:overflow-visible">{children}</main>

        {/* Bottom nav (mobile only) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] print:hidden">
          <div className="grid grid-cols-5">
            {bottomNav.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active ? "scale-110" : item.color)} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
