import { menuGroups, SIDEBAR_EN } from "@/components/AppSidebar";

export interface RouteInfo {
  path: string;
  title: string;
  titleEn: string;
  group: string;
  groupEn: string;
  groupHref: string; // first item of the group
}

// Build a lookup table from sidebar menuGroups
const REGISTRY: Record<string, RouteInfo> = {};
for (const g of menuGroups) {
  const groupHref = g.items[0]?.url ?? "/dashboard";
  const groupEn = g.labelEn || SIDEBAR_EN[g.label] || g.label;
  for (const item of g.items) {
    REGISTRY[item.url] = {
      path: item.url,
      title: item.title,
      titleEn: item.titleEn || SIDEBAR_EN[item.title] || item.title,
      group: g.label,
      groupEn,
      groupHref,
    };
  }
}

// Manually-registered routes that don't appear in the sidebar
// (parent-pages and dynamic detail pages)
const EXTRA: Record<string, Omit<RouteInfo, "path">> = {
  "/dashboard/clients": {
    title: "ক্লায়েন্ট", titleEn: "Clients",
    group: "All Clients", groupEn: "All Clients",
    groupHref: "/dashboard/clients/home",
  },
  "/dashboard/billing": {
    title: "বিলিং", titleEn: "Billing",
    group: "All Clients", groupEn: "All Clients",
    groupHref: "/dashboard/clients/home",
  },
  "/dashboard/mikrotik/bulk-import": {
    title: "বাল্ক ইমপোর্ট", titleEn: "Bulk Import",
    group: "ডিভাইস", groupEn: "Devices",
    groupHref: "/dashboard/device-admin",
  },
  "/dashboard/mikrotik": {
    title: "MikroTik", titleEn: "MikroTik",
    group: "ডিভাইস", groupEn: "Devices",
    groupHref: "/dashboard/device-admin",
  },
};
for (const [path, info] of Object.entries(EXTRA)) {
  if (!REGISTRY[path]) REGISTRY[path] = { path, ...info };
}

export function lookupRoute(pathname: string): RouteInfo | undefined {
  // exact match first
  if (REGISTRY[pathname]) return REGISTRY[pathname];
  // try progressively shorter paths (so /dashboard/clients/home/123 → /dashboard/clients/home)
  const parts = pathname.split("/").filter(Boolean);
  for (let i = parts.length - 1; i > 0; i--) {
    const candidate = "/" + parts.slice(0, i).join("/");
    if (REGISTRY[candidate]) return REGISTRY[candidate];
  }
  return undefined;
}

// Pretty-print fallback for unknown segments
export function humanizeSegment(seg: string): string {
  if (/^[0-9a-f-]{8,}$/i.test(seg)) return "#" + seg.slice(0, 6);
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
