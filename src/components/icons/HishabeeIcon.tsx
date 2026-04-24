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
export const HISHABEE_URLS = Object.values(ICONS);

export type HishabeeIconName = string;

// Synchronous warm — kicks off parallel fetches at module-load.
let warmed = false;
function warmCache() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  for (const url of HISHABEE_URLS) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
warmCache();

/** Awaitable preload — resolves when every icon has loaded (or failed). */
export function preloadAllHishabee(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return Promise.all(
    HISHABEE_URLS.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  ).then(() => undefined);
}

interface Props {
  name: HishabeeIconName;
  size?: number;
  className?: string;
  alt?: string;
}

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
