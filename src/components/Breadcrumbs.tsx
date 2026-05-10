import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, ChevronLeft, Home } from "lucide-react";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();

  if (crumbs.length === 0) return null;
  const isRoot = pathname === "/dashboard" || pathname === "/dashboard/";

  return (
    <nav
      aria-label="breadcrumb"
      className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"
    >
      {!isRoot && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-7 px-2 -ml-2 gap-1 text-muted-foreground hover:text-foreground"
          title={t("পূর্বের পেজে ফিরুন", "Go back")}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("পেছনে", "Back")}</span>
        </Button>
      )}

      <ol className="flex flex-wrap items-center gap-1.5 min-w-0">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const isFirst = i === 0;
          // On mobile, hide middle crumbs to save space
          const hideMobile = !isFirst && !isLast && crumbs.length > 2;
          return (
            <li
              key={i}
              className={cn(
                "flex items-center gap-1.5 min-w-0",
                hideMobile && "hidden sm:flex"
              )}
            >
              {!isFirst && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              {c.href && !isLast ? (
                <Link
                  to={c.href}
                  className={cn(
                    "truncate transition-colors hover:text-foreground",
                    isFirst && "flex items-center gap-1"
                  )}
                >
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  <span>{c.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "truncate font-medium text-foreground",
                    isFirst && "flex items-center gap-1"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  <span>{c.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
