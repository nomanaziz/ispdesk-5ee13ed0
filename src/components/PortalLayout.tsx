import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, FileText, HeadphonesIcon, LogOut, Menu, X,
  Activity, Bell, Building2, Clapperboard, BookOpen, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/portal/dashboard" },
  { label: "Live Usage", icon: Activity, path: "/portal/live-usage" },
  { label: "Notices", icon: Bell, path: "/portal/notices" },
  { label: "Company Info", icon: Building2, path: "/portal/company" },
  { label: "Movie/FTP Servers", icon: Clapperboard, path: "/portal/media" },
  { label: "My Ledger", icon: BookOpen, path: "/portal/ledger" },
  { label: "Invoices", icon: FileText, path: "/portal/invoices" },
  { label: "Support Tickets", icon: HeadphonesIcon, path: "/portal/support" },
];

const bottomNav = [
  { label: "Home", icon: LayoutDashboard, path: "/portal/dashboard" },
  { label: "Notices", icon: Bell, path: "/portal/notices" },
  { label: "Tickets", icon: HeadphonesIcon, path: "/portal/support" },
  { label: "Ledger", icon: BookOpen, path: "/portal/ledger" },
  { label: "Invoices", icon: FileText, path: "/portal/invoices" },
];

export const PortalLayout = ({ children }: { children: React.ReactNode }) => {
  const { customer, logout } = usePortalAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials =
    customer?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-[hsl(220,30%,97%)]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-[hsl(222,47%,11%)] text-white flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* User card */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/40">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{customer?.name || "Customer"}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-300/90">Signed in</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white/60 h-8 w-8"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold">
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/10 text-white font-medium border-l-2 border-violet-400"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="px-2 pt-5 pb-2 text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            Account
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>

        <div className="px-5 py-3 border-t border-white/10 text-[11px] text-white/40">
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
        <header className="h-14 sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-semibold text-sm hidden sm:block">Customer Portal</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 px-2 py-1.5 rounded-lg hover:bg-muted">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-[11px]">
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
        </header>

        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto">{children}</main>

        {/* Bottom nav (mobile only) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            {bottomNav.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors",
                    active ? "text-violet-600" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "scale-110")} />
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
