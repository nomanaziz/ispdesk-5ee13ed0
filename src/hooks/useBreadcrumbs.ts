import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { lookupRoute, humanizeSegment } from "@/lib/routeRegistry";

export interface Crumb {
  label: string;
  href: string | null; // null = current page
}

export function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const isBn = lang === "bn";

  if (!pathname.startsWith("/dashboard")) return [];

  const crumbs: Crumb[] = [
    { label: isBn ? "ড্যাশবোর্ড" : "Dashboard", href: "/dashboard" },
  ];

  if (pathname === "/dashboard" || pathname === "/dashboard/") return crumbs;

  const info = lookupRoute(pathname);

  if (info) {
    // Add group crumb (only if it's not the dashboard group itself)
    if (info.group !== "ড্যাশবোর্ড" && info.groupHref !== pathname) {
      crumbs.push({
        label: isBn ? info.group : info.groupEn,
        href: info.groupHref,
      });
    }
    // current page
    crumbs.push({
      label: isBn ? info.title : info.titleEn,
      href: info.path === pathname ? null : pathname,
    });

    // If we matched a parent (dynamic child route), add tail segment
    if (info.path !== pathname) {
      const tail = pathname.slice(info.path.length).split("/").filter(Boolean);
      if (tail.length) {
        // last crumb becomes clickable (back to parent), tail is current
        const last = crumbs[crumbs.length - 1];
        last.href = info.path;
        crumbs.push({ label: humanizeSegment(tail[tail.length - 1]), href: null });
      }
    }
  } else {
    // Fallback: humanize last segment
    const segs = pathname.split("/").filter(Boolean);
    crumbs.push({ label: humanizeSegment(segs[segs.length - 1]), href: null });
  }

  return crumbs;
}
