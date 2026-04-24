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
export const ICONS8_URLS = Object.values(ICONS);

// Synchronously fire `new Image()` requests at module-load so the browser
// kicks off parallel HTTP/2 fetches immediately — no idle wait.
let warmed = false;
function warmCache() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;
  for (const url of ICONS8_URLS) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}
warmCache();

/** Awaitable preload — resolves when every icon has been decoded (or failed). */
export function preloadAllIcons8(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return Promise.all(
    ICONS8_URLS.map(
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
  name: string;
  size?: number;
  className?: string;
  alt?: string;
  /** Hover bounce/pop for interactive feel (sidebar items, cards). Default: true */
  interactive?: boolean;
}

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
