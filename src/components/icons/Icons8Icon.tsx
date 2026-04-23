import { cn } from "@/lib/utils";

// Eager-load every Icons8 PNG at build time as URLs.
const modules = import.meta.glob("@/assets/icons/icons8/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const name = file.replace(/\.png$/i, "");
  ICONS[name] = url;
}

export const ICONS8_NAMES = Object.keys(ICONS).sort();

// Warm the browser HTTP cache for every icon URL once at module load,
// so the first <img> render hits cache instantly. Total payload ~456KB
// across 152 tiny PNGs — fetched in parallel during idle time.
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
  name: string;
  size?: number;
  className?: string;
  alt?: string;
  /** Hover bounce/pop for interactive feel (sidebar items, cards). Default: true */
  interactive?: boolean;
}

/**
 * Renders an Icons8 colored icon as <img>.
 * Returns null if the name is unknown so callers can fall back.
 *
 * Performance:
 *  - All URLs resolved at build time (no dynamic import on render)
 *  - HTTP cache warmed at module load → near-instant first paint
 *  - `loading="eager"` + `fetchpriority="high"` so sidebar/menu icons
 *    do not vanish/redraw on collapse-expand
 */
export function Icons8Icon({
  name,
  size = 24,
  className,
  alt = "",
  interactive = true,
}: Props) {
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
      className={cn(
        "object-contain shrink-0 select-none",
        interactive && "transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3",
        className,
      )}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function hasIcons8Icon(name?: string | null): boolean {
  return !!name && name in ICONS;
}
