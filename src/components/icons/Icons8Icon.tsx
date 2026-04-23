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
      loading="lazy"
      decoding="async"
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
