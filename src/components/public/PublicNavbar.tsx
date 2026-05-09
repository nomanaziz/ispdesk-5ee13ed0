import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Wifi, User, LogOut, LayoutDashboard, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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

const fallbackLinksBn = [
  { title: "হোম", url: "/" },
  { title: "প্যাকেজ", url: "/packages" },
  { title: "সেবা সমূহ", url: "/services" },
  { title: "শপ", url: "/shop" },
  { title: "কভারেজ", url: "/coverage" },
  { title: "আমাদের সম্পর্কে", url: "/about" },
  { title: "অফার", url: "/offers" },
  { title: "যোগাযোগ", url: "/contact" },
];
const fallbackLinksEn = [
  { title: "Home", url: "/" },
  { title: "Packages", url: "/packages" },
  { title: "Services", url: "/services" },
  { title: "Shop", url: "/shop" },
  { title: "Coverage", url: "/coverage" },
  { title: "About", url: "/about" },
  { title: "Offers", url: "/offers" },
  { title: "Contact", url: "/contact" },
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
  const { lang, setLang, t } = useLanguage();
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

  const fallbackLinks = lang === "bn" ? fallbackLinksBn : fallbackLinksEn;
  const navLinks =
    menuRows && menuRows.length > 0
      ? menuRows.map((m) => ({ title: m.title, url: m.url || "/" }))
      : fallbackLinks;

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
  const dashboardPath = isAdmin ? "/dashboard" : "/portal/dashboard";
  const dashboardLabel = isAdmin
    ? t("ড্যাশবোর্ড", "Dashboard")
    : t("আমার পোর্টাল", "My Portal");

  const handleLogout = async () => {
    setOpen(false);
    if (isAdmin) {
      await signOut();
    } else if (isCustomer) {
      portalLogout();
    }
    navigate("/");
  };

  const LangToggle = ({ className = "" }: { className?: string }) => (
    <div className={cn("inline-flex items-center rounded-md border border-slate-200 overflow-hidden text-xs", className)}>
      <button
        type="button"
        onClick={() => setLang("bn")}
        className={cn(
          "px-2 py-1 font-semibold transition-colors",
          lang === "bn" ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        )}
        aria-pressed={lang === "bn"}
      >
        বাং
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "px-2 py-1 font-semibold transition-colors",
          lang === "en" ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
        )}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );

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
          {isAdmin ? t("অ্যাডমিন", "Admin") : t("গ্রাহক", "Customer")}
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
          {t("লগআউট", "Logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2.5">
            <img src={ispDeskLogo} alt="ISP Desk" className="h-10 w-auto object-contain" />
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
            <LangToggle />
            <CartIcon />
            <NavLink to="/quick-pay">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20">
                {t("বিল পরিশোধ", "Pay Bill")}
              </Button>
            </NavLink>
            <NavLink to="/new-connection">
              <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-700 hover:bg-cyan-50 font-medium">
                {t("কানেকশন নিন", "Get Connection")}
              </Button>
            </NavLink>
            {isLoggedIn ? (
              <UserMenu />
            ) : (
              <NavLink to="/login">
                <Button size="sm" variant="ghost" className="text-slate-600 hover:text-cyan-700 gap-1">
                  <User className="h-4 w-4" /> {t("লগইন", "Login")}
                </Button>
              </NavLink>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <LangToggle />
            <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)}>
              {open ? <X className="h-6 w-6 text-slate-700" /> : <Menu className="h-6 w-6 text-slate-700" />}
            </button>
          </div>
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
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold">{t("বিল পরিশোধ", "Pay Bill")}</Button>
              </NavLink>
              <NavLink to="/new-connection" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full border-cyan-500 text-cyan-700">{t("কানেকশন নিন", "Get Connection")}</Button>
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
                      <div className="text-[11px] text-slate-500">{isAdmin ? t("অ্যাডমিন", "Admin") : t("গ্রাহক", "Customer")}</div>
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
                    <LogOut className="h-4 w-4 mr-2" /> {t("লগআউট", "Logout")}
                  </Button>
                </>
              ) : (
                <NavLink to="/login" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full text-slate-600">
                    <User className="h-4 w-4 mr-2" /> {t("লগইন", "Login")}
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
