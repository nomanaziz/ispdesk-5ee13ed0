import { ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Eye, List, MoreHorizontal, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  backTo?: string;
  showTabs?: boolean;
}

export function OltMobileLayout({ children, title, right, backTo, showTabs = true }: Props) {
  const { id } = useParams();
  const loc = useLocation();
  const tabs = id
    ? [
        { to: `/m/olt/${id}`, label: "Overview", icon: Eye, exact: true },
        { to: `/m/olt/${id}/onus`, label: "ONU List", icon: List },
        { to: `/m/olt/${id}/more`, label: "More", icon: MoreHorizontal },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col relative">
        {/* Top bar */}
        {(title || backTo) && (
          <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-border px-3 py-3 flex items-center gap-2">
            {backTo && (
              <Link to={backTo} className="p-1.5 -ml-1 rounded-lg hover:bg-muted">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            )}
            <h1 className="text-lg font-semibold text-sky-600 flex-1 truncate">{title}</h1>
            {right}
          </header>
        )}

        <main className={cn("flex-1 px-3 py-3", showTabs && id && "pb-24")}>{children}</main>

        {/* Bottom tabs (only when inside an OLT) */}
        {showTabs && id && (
          <nav
            className="fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-border"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="max-w-md mx-auto grid grid-cols-3">
              {tabs.map((t) => {
                const active = t.exact
                  ? loc.pathname === t.to
                  : loc.pathname.startsWith(t.to);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium",
                      active ? "text-sky-600" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
