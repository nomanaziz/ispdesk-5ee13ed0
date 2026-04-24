import { cn } from "@/lib/utils";

// Eager-load every Hishabee asset (svg + png) at build time as URLs.
const modules = import.meta.glob("@/assets/icons/hishabee/*.{svg,png}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const name = file.replace(/\.(svg|png)$/i, "");
  ICONS[name] = url;
}

export const HISHABEE_ICON_NAMES = Object.keys(ICONS).sort();

export type HishabeeIconName = string;

// Warm the browser HTTP cache for every icon at idle time so the first
// <img> render hits cache instantly — prevents the "text first, icon later"
// flash in sidebars and menus.
let warmed = false;
function warmCache() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  const run = () => {
    for (const url of Object.values(ICONS)) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  };
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 200);
  }
}
warmCache();

interface Props {
  name: HishabeeIconName;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Renders a Hishabee colored illustration icon.
 * Returns null if the name is unknown so callers can fall back to lucide.
 *
 * Performance: eager loading + cache warm = no flash of text-without-icon.
 */
export function HishabeeIcon({ name, size = 24, className, alt = "" }: Props) {
  const url = ICONS[name];
  if (!url) return null;
  return (
    <img
      src={url}
      width={size}
      height={size}
      alt={alt}
      loading="eager"
      decoding="async"
      // @ts-expect-error -- valid HTML attribute, not yet in React types
      fetchpriority="high"
      className={cn("object-contain shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function hasHishabeeIcon(name?: string | null): boolean {
  return !!name && name in ICONS;
}
