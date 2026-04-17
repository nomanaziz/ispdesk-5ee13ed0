import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Wifi, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CartIcon } from "@/components/public/CartIcon";

const navLinks = [
  { label: "হোম", to: "/" },
  { label: "প্যাকেজ", to: "/packages" },
  { label: "সেবা সমূহ", to: "/services" },
  { label: "শপ", to: "/shop" },
  { label: "কভারেজ", to: "/coverage" },
  { label: "আমাদের সম্পর্কে", to: "/about" },
  { label: "অফার", to: "/offers" },
  { label: "যোগাযোগ", to: "/contact" },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 leading-tight block">ISP Desk</span>
              <span className="text-[10px] text-slate-400 leading-none -mt-0.5 block">ইন্টারনেট সেবা</span>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-cyan-700 bg-cyan-50"
                      : "text-slate-600 hover:text-cyan-700 hover:bg-slate-50"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side buttons */}
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

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6 text-slate-700" /> : <Menu className="h-6 w-6 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white shadow-lg">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive ? "text-cyan-700 bg-cyan-50" : "text-slate-600 hover:bg-slate-50"
                  )
                }
              >
                {link.label}
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
