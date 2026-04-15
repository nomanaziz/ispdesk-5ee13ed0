import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard, FileText, ShoppingCart, HeadphonesIcon,
  LogOut, Menu, X, ChevronDown
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/portal/dashboard" },
  { label: "Billing Invoices", icon: FileText, path: "/portal/invoices" },
  { label: "Purchase Orders", icon: ShoppingCart, path: "/portal/purchase-orders" },
  { label: "Support Tickets", icon: HeadphonesIcon, path: "/portal/support" },
];

export const PortalLayout = ({ children }: { children: React.ReactNode }) => {
  const { customer, logout } = usePortalAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = customer?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-[hsl(222,47%,10%)] border-r border-border flex flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">G</div>
          <div>
            <div className="font-semibold text-white text-sm">Galaxy Net</div>
            <div className="text-xs text-white/50">Customer Portal</div>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden text-white/60" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block text-sm text-muted-foreground">
            Welcome, <span className="text-foreground font-medium">{customer?.name}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm hidden sm:inline">{customer?.name}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={logout} className="text-red-500">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
