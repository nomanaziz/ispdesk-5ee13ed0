import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Wifi, User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { CartIcon } from "@/components/public/CartIcon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const fallbackLinks = [
  { title: "হোম", url: "/" },
  { title: "প্যাকেজ", url: "/packages" },
  { title: "সেবা সমূহ", url: "/services" },
  { title: "শপ", url: "/shop" },
  { title: "কভারেজ", url: "/coverage" },
  { title: "আমাদের সম্পর্কে", url: "/about" },
  { title: "অফার", url: "/offers" },
  { title: "যোগাযোগ", url: "/contact" },
];

function shortName(full: string, max = 12) {
  const first = (full || "").trim().split(/\s+/)[0] || "";
  return first.length > max ? first.slice(0, max) + "…" : first;
}

function initials(full: string) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return ((parts[0][0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { customer, logout: portalLogout } = usePortalAuth();
  const navigate = useNavigate();

  const { data: menuRows } = useQuery({
    queryKey: ["website_menu", "header"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("website_menu")
        .select("id,title,url,sort_order,status,location")
        .eq("status", "active")
        .eq("location", "header")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as { title: string; url: string | null }[];
    },
    staleTime: 30_000,
  });

  const navLinks =
    menuRows && menuRows.length > 0
      ? menuRows.map((m) => ({ title: m.title, url: m.url || "/" }))
      : fallbackLinks;

  // Resolve a single "current user" view (admin > customer)
  const adminFull =
    (user?.user_metadata as any)?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const customerFull = customer?.name || customer?.username || "";

  const isAdmin = !!user;
  const isCustomer = !!customer && !isAdmin;
  const isLoggedIn = isAdmin || isCustomer;

  const displayFull = isAdmin ? adminFull : customerFull;
  const displayShort = shortName(displayFull);
  const displayInitials = initials(displayFull);
  const dashboardPath = isAdmin ? "/dashboard" : "/portal";
  const dashboardLabel = isAdmin ? "ড্যাশবোর্ড" : "আমার পোর্টাল";

  const handleLogout = async () => {
    setOpen(false);
    if (isAdmin) {
      await signOut();
    } else if (isCustomer) {
      portalLogout();
    }
    navigate("/");
  };

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-2 text-slate-700 hover:text-cyan-700 hover:bg-slate-50"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white text-xs font-semibold">
              {displayInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium max-w-[100px] truncate">
            {displayShort}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-white">
        <DropdownMenuLabel className="text-slate-500 text-xs font-normal">
          {isAdmin ? "অ্যাডমিন" : "গ্রাহক"}
          <div className="text-slate-900 text-sm font-semibold truncate">
            {displayFull}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate(dashboardPath)}
          className="cursor-pointer"
        >
          <LayoutDashboard className="h-4 w-4 mr-2" />
          {dashboardLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          লগআউট
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 leading-tight block">ISP Desk</span>
              <span className="text-[10px] text-slate-400 leading-none -mt-0.5 block">ইন্টারনেট সেবা</span>
            </div>
          </NavLink>

          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <NavLink
                key={link.url + link.title}
                to={link.url}
                end={link.url === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive ? "text-cyan-700 bg-cyan-50" : "text-slate-600 hover:text-cyan-700 hover:bg-slate-50"
                  )
                }
              >
                {link.title}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <CartIcon />
            <NavLink to="/quick-pay">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20">
                বিল পরিশোধ
              </Button>
            </NavLink>
            <NavLink to="/new-connection">
              <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-700 hover:bg-cyan-50 font-medium">
                কানেকশন নিন
              </Button>
            </NavLink>
            {isLoggedIn ? (
              <UserMenu />
            ) : (
              <NavLink to="/login">
                <Button size="sm" variant="ghost" className="text-slate-600 hover:text-cyan-700 gap-1">
                  <User className="h-4 w-4" /> লগইন
                </Button>
              </NavLink>
            )}
          </div>

          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6 text-slate-700" /> : <Menu className="h-6 w-6 text-slate-700" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white shadow-lg">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.url + link.title}
                to={link.url}
                end={link.url === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive ? "text-cyan-700 bg-cyan-50" : "text-slate-600 hover:bg-slate-50"
                  )
                }
              >
                {link.title}
              </NavLink>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <NavLink to="/quick-pay" onClick={() => setOpen(false)}>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold">বিল পরিশোধ</Button>
              </NavLink>
              <NavLink to="/new-connection" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full border-cyan-500 text-cyan-700">কানেকশন নিন</Button>
              </NavLink>
              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white text-xs font-semibold">
                        {displayInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{displayFull}</div>
                      <div className="text-[11px] text-slate-500">{isAdmin ? "অ্যাডমিন" : "গ্রাহক"}</div>
                    </div>
                  </div>
                  <NavLink to={dashboardPath} onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full text-slate-700 justify-start">
                      <LayoutDashboard className="h-4 w-4 mr-2" /> {dashboardLabel}
                    </Button>
                  </NavLink>
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> লগআউট
                  </Button>
                </>
              ) : (
                <NavLink to="/login" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full text-slate-600">
                    <User className="h-4 w-4 mr-2" /> লগইন
                  </Button>
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
