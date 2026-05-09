import type { LucideIcon } from "lucide-react";
import type { Tint } from "@/components/sidebar/MenuIconTile";

export interface PortalMenuItem {
  title: string;
  titleEn?: string;
  url: string;
  icon: LucideIcon;
}

export interface PortalMenuGroup {
  /** Stable key (used for open/close tracking and permission filter) */
  key: string;
  label: string;
  labelEn?: string;
  icon: LucideIcon;
  /** Optional explicit color tint for the icon tile */
  tint?: Tint;
  /** Render as a single direct link (no expand). Auto when items.length === 1 */
  direct?: boolean;
  defaultOpen?: boolean;
  items: PortalMenuItem[];
}

/** Pick a sensible default tint when group hasn't specified one */
const FALLBACK_TINTS: Tint[] = [
  "indigo", "violet", "blue", "cyan", "emerald", "amber",
  "rose", "pink", "purple", "teal", "sky", "orange", "fuchsia", "lime",
];

export function pickTint(group: PortalMenuGroup, idx: number): Tint {
  if (group.tint) return group.tint;
  return FALLBACK_TINTS[idx % FALLBACK_TINTS.length];
}
