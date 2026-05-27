import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, User, Calendar, FileText, Wallet,
  LogOut as LogOutIcon, Clock, Utensils, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { url: "/dashboard/me", label: "আমার ড্যাশবোর্ড", icon: LayoutDashboard, end: true },
  { url: "/dashboard/me/profile", label: "আমার প্রোফাইল", icon: User },
  { url: "/dashboard/me/attendance", label: "হাজিরা", icon: Clock },
  { url: "/dashboard/me/leave", label: "ছুটি", icon: Calendar },
  { url: "/dashboard/me/payslip", label: "পে-স্লিপ", icon: FileText },
  { url: "/dashboard/me/advance", label: "অগ্রিম বেতন", icon: Wallet },
  { url: "/dashboard/me/resignation", label: "পদত্যাগ", icon: LogOutIcon },
  { url: "/dashboard/me/meals", label: "খাবার অর্ডার", icon: Utensils },
  { url: "/dashboard/me/requisitions", label: "রিকুইজিশন", icon: ClipboardList },
];

export default function MyShell() {
  const { pathname } = useLocation();
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2 border-b">
        {items.map((it) => {
          const active = it.end ? pathname === it.url : pathname.startsWith(it.url);
          return (
            <NavLink
              key={it.url}
              to={it.url}
              end={it.end}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-foreground hover:bg-muted"
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
