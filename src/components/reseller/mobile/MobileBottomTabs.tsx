import { Link, useLocation } from "react-router-dom";
import { Home, Receipt, Wallet, Wifi, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icons8Icon, hasIcons8Icon } from "@/components/icons/Icons8Icon";

interface Tab {
  to: string;
  icon: any;
  bn: string;
  en: string;
  matchPrefix?: string;
  icons8?: string;
}

export function MobileBottomTabs() {
  const { lang } = useLanguage();
  const location = useLocation();
  const tabs: Tab[] = [
    { to: "/pop-admin/dashboard", icon: Home, bn: "হোম", en: "Home", icons8: "business" },
    { to: "/pop-admin/billing/list", icon: Receipt, bn: "বিলিং", en: "Billing", matchPrefix: "/pop-admin/billing", icons8: "documents" },
    { to: "/pop-admin/billing/daily-collection", icon: Wallet, bn: "সংগ্রহ", en: "Collection", icons8: "coins" },
    { to: "/pop-admin/monitoring/online", icon: Wifi, bn: "মনিটর", en: "Monitor", matchPrefix: "/pop-admin/monitoring", icons8: "wi-fi-connected" },
    { to: "/pop-admin/tickets", icon: LifeBuoy, bn: "সাপোর্ট", en: "Support", icons8: "online-support" },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border/60 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const useIcons8 = hasIcons8Icon(tab.icons8);
          const active = tab.matchPrefix
            ? location.pathname.startsWith(tab.matchPrefix)
            : location.pathname === tab.to ||
              (tab.to !== "/pop-admin/dashboard" && location.pathname.startsWith(tab.to));
          return (
            <li key={tab.to}>
              <Link
                to={tab.to}
                className={cn(
                  "group flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {useIcons8 ? (
                  <Icons8Icon name={tab.icons8!} size={26} className={cn("transition-transform", active && "scale-110")} />
                ) : (
                  <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
                )}
                <span className="leading-none">{lang === "bn" ? tab.bn : tab.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
