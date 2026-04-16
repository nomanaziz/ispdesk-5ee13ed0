import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Wallet, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/reseller/dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { to: "/reseller/balance", label: "ব্যালেন্স", icon: Wallet },
  { to: "/reseller/clients", label: "ক্লায়েন্ট", icon: Users },
];

export const ResellerLayout = ({ children }: { children: ReactNode }) => {
  const { customer, logout } = usePortalAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <div className="h-14 px-4 flex items-center gap-2 border-b">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold">Reseller Portal</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> লগআউট
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b bg-card px-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{customer?.name}</div>
            <div className="text-xs text-muted-foreground">{customer?.username}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="md:hidden">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default ResellerLayout;
