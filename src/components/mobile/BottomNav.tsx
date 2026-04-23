import { Link, useLocation } from "react-router-dom";
import { LucideIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: string;
}

interface Props {
  items: BottomNavItem[]; // exactly 4 items recommended (FAB sits in middle)
  fab?: {
    to?: string;
    onClick?: () => void;
    icon?: LucideIcon;
    label?: string;
  };
}

export function BottomNav({ items, fab }: Props) {
  const location = useLocation();
  const FabIcon = fab?.icon ?? Plus;

  const renderItem = (item: BottomNavItem) => {
    const Icon = item.icon;
    const active = item.matchPrefix
      ? location.pathname.startsWith(item.matchPrefix)
      : location.pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors min-h-[56px]",
          active ? "text-rose-600" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={2.2} />
        <span className="leading-none">{item.label}</span>
      </Link>
    );
  };

  // Split for FAB layout: first half | FAB | second half
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border/60 print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative max-w-md mx-auto">
        {fab && (
          <Link
            to={fab.to || "#"}
            onClick={fab.onClick}
            aria-label={fab.label || "Add"}
            className="absolute left-1/2 -translate-x-1/2 -top-6 h-14 w-14 rounded-full m-hero-gradient text-white flex items-center justify-center shadow-[var(--m-shadow-pop)] active:scale-95 transition-transform border-4 border-background"
          >
            <FabIcon className="h-6 w-6" strokeWidth={2.5} />
          </Link>
        )}
        <div className={cn("grid", fab ? "grid-cols-5" : `grid-cols-${items.length}`)}>
          {fab ? (
            <>
              {left.map(renderItem)}
              <div /> {/* spacer for FAB */}
              {right.map(renderItem)}
            </>
          ) : (
            items.map(renderItem)
          )}
        </div>
      </div>
    </nav>
  );
}
