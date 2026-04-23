import { cn } from "@/lib/utils";

// Eager-load every Hishabee asset (svg + png) at build time as URLs.
// This keeps the API simple: <HishabeeIcon name="cart" /> and Vite
// resolves the right hashed asset URL.
const modules = import.meta.glob("@/assets/icons/hishabee/*.{svg,png}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// Build a name -> url map keyed by the bare filename without extension.
const ICONS: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const name = file.replace(/\.(svg|png)$/i, "");
  ICONS[name] = url;
}

export const HISHABEE_ICON_NAMES = Object.keys(ICONS).sort();

export type HishabeeIconName = string;

interface Props {
  name: HishabeeIconName;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Renders a Hishabee colored illustration icon.
 * Returns null if the name is unknown so callers can fall back to lucide.
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
      loading="lazy"
      decoding="async"
      className={cn("object-contain shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function hasHishabeeIcon(name?: string | null): boolean {
  return !!name && name in ICONS;
}
