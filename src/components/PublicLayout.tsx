import { TopInfoBar } from "@/components/public/TopInfoBar";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Wifi } from "lucide-react";
import { NavLink } from "react-router-dom";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <TopInfoBar />
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />

      {/* Floating WiFi button */}
      <NavLink
        to="/new-connection"
        className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-xl shadow-teal-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        title="কানেকশন নিন"
      >
        <Wifi className="h-6 w-6" />
      </NavLink>
    </div>
  );
}
