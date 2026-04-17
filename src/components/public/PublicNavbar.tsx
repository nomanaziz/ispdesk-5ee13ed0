import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Wifi, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CartIcon } from "@/components/public/CartIcon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

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
            {user ? (
              <NavLink to="/dashboard">
                <Button size="sm" variant="ghost" className="text-slate-600 hover:text-cyan-700">
                  <User className="h-4 w-4 mr-1" /> ড্যাশবোর্ড
                </Button>
              </NavLink>
            ) : (
              <NavLink to="/login">
                <Button size="sm" variant="ghost" className="text-slate-600 hover:text-cyan-700">
                  <User className="h-4 w-4" />
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
              {user ? (
                <NavLink to="/dashboard" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full text-slate-600">ড্যাশবোর্ড</Button>
                </NavLink>
              ) : (
                <NavLink to="/login" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full text-slate-600">লগইন</Button>
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
