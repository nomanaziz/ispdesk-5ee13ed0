import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "হোম", to: "/" },
  { label: "প্যাকেজ", to: "/packages" },
  { label: "কভারেজ", to: "/coverage" },
  { label: "কানেকশন নিন", to: "/new-connection" },
  { label: "সার্ভিস", to: "/services" },
  { label: "আমাদের সম্পর্কে", to: "/about" },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ISP Desk</span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "text-teal-600 bg-teal-50"
                      : "text-slate-600 hover:text-teal-600 hover:bg-slate-50"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <NavLink to="/quick-pay">
              <Button variant="outline" size="sm" className="border-teal-500 text-teal-600 hover:bg-teal-50">
                Quick Pay
              </Button>
            </NavLink>
            {user ? (
              <NavLink to="/dashboard">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                  ড্যাশবোর্ড
                </Button>
              </NavLink>
            ) : (
              <NavLink to="/login">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                  লগইন
                </Button>
              </NavLink>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6 text-slate-700" /> : <Menu className="h-6 w-6 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "block px-3 py-2 rounded-md text-sm font-medium",
                    isActive ? "text-teal-600 bg-teal-50" : "text-slate-600"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <NavLink to="/quick-pay" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full border-teal-500 text-teal-600">Quick Pay</Button>
              </NavLink>
              {user ? (
                <NavLink to="/dashboard" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-teal-600 text-white">ড্যাশবোর্ড</Button>
                </NavLink>
              ) : (
                <NavLink to="/login" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-teal-600 text-white">লগইন</Button>
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
