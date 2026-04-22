import { Link, useLocation } from "react-router-dom";
import { Home, Receipt, Wallet, Wifi, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface Tab {
  to: string;
  icon: any;
  bn: string;
  en: string;
  matchPrefix?: string;
}

export function MobileBottomTabs() {
  const { lang } = useLanguage();
  const location = useLocation();
  const tabs: Tab[] = [
    { to: "/pop-admin/dashboard", icon: Home, bn: "হোম", en: "Home" },
    { to: "/pop-admin/billing/list", icon: Receipt, bn: "বিলিং", en: "Billing", matchPrefix: "/pop-admin/billing" },
    { to: "/pop-admin/billing/daily-collection", icon: Wallet, bn: "সংগ্রহ", en: "Collection" },
    { to: "/pop-admin/monitoring/online", icon: Wifi, bn: "মনিটর", en: "Monitor", matchPrefix: "/pop-admin/monitoring" },
    { to: "/pop-admin/tickets", icon: LifeBuoy, bn: "সাপোর্ট", en: "Support" },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border/60 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.matchPrefix
            ? location.pathname.startsWith(tab.matchPrefix)
            : location.pathname === tab.to ||
              (tab.to !== "/pop-admin/dashboard" && location.pathname.startsWith(tab.to));
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
                <span className="leading-none">{lang === "bn" ? tab.bn : tab.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
