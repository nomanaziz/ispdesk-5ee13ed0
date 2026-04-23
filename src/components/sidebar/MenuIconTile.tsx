import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tint =
  | "rose" | "orange" | "amber" | "yellow" | "lime"
  | "emerald" | "green" | "teal" | "cyan" | "sky"
  | "blue" | "indigo" | "violet" | "purple" | "fuchsia"
  | "pink" | "slate" | "zinc" | "stone" | "red";

// Bright filled tile (light mode) + softer tinted tile (dark mode).
// Active state is slightly stronger.
const TINT_BG: Record<Tint, string> = {
  rose: "bg-rose-500 dark:bg-rose-500/20 dark:text-rose-300",
  orange: "bg-orange-500 dark:bg-orange-500/20 dark:text-orange-300",
  amber: "bg-amber-500 dark:bg-amber-500/20 dark:text-amber-300",
  yellow: "bg-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-300",
  lime: "bg-lime-500 dark:bg-lime-500/20 dark:text-lime-300",
  emerald: "bg-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300",
  green: "bg-green-500 dark:bg-green-500/20 dark:text-green-300",
  teal: "bg-teal-500 dark:bg-teal-500/20 dark:text-teal-300",
  cyan: "bg-cyan-500 dark:bg-cyan-500/20 dark:text-cyan-300",
  sky: "bg-sky-500 dark:bg-sky-500/20 dark:text-sky-300",
  blue: "bg-blue-500 dark:bg-blue-500/20 dark:text-blue-300",
  indigo: "bg-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-300",
  violet: "bg-violet-500 dark:bg-violet-500/20 dark:text-violet-300",
  purple: "bg-purple-500 dark:bg-purple-500/20 dark:text-purple-300",
  fuchsia: "bg-fuchsia-500 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  pink: "bg-pink-500 dark:bg-pink-500/20 dark:text-pink-300",
  slate: "bg-slate-500 dark:bg-slate-500/25 dark:text-slate-200",
  zinc: "bg-zinc-500 dark:bg-zinc-500/25 dark:text-zinc-200",
  stone: "bg-stone-500 dark:bg-stone-500/25 dark:text-stone-200",
  red: "bg-red-500 dark:bg-red-500/20 dark:text-red-300",
};

// Map existing Bangla group labels (and a few keywords) to a tint.
const LABEL_TINT: Record<string, Tint> = {
  "ড্যাশবোর্ড": "indigo",
  "ওয়েবসাইট প্যানেল": "sky",
  "কনফিগারেশন": "slate",
  "VAS": "teal",
  "হোম ক্লায়েন্ট": "blue",
  "POP / MAC ক্লায়েন্ট": "violet",
  "ব্যান্ডউইথ ক্লায়েন্ট": "cyan",
  "ডিভাইস": "emerald",
  "HR ও পেরোল": "pink",
  "OLT ম্যানেজমেন্ট": "purple",
  "নেটওয়ার্ক মনিটরিং": "green",
  "নেটওয়ার্ক ডায়াগ্রাম": "lime",
  "ছুটি ম্যানেজমেন্ট": "amber",
  "ইভেন্ট ও ছুটি": "yellow",
  "সাপোর্ট ও টিকেটিং": "rose",
  "টাস্ক ম্যানেজমেন্ট": "fuchsia",
  "ব্যান্ডউইথ ক্রয়": "cyan",
  "ক্রয়": "orange",
  "বিক্রয় ও সার্ভিস": "red",
  "ইনভেন্টরি": "amber",
  "অ্যাসেট": "stone",
  "অ্যাকাউন্টিং": "green",
  "রিপোর্ট": "blue",
  "SMS সার্ভিস": "sky",
  "ই-কমার্স": "pink",
  "সিস্টেম": "zinc",
};

export function tintForLabel(label?: string): Tint {
  if (!label) return "slate";
  return LABEL_TINT[label] ?? "slate";
}

interface MenuIconTileProps {
  icon: LucideIcon;
  tint?: Tint;
  active?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Colorful rounded-square tile that wraps a Lucide icon.
 * Light mode: filled bright bg + white icon.
 * Dark mode: tinted soft bg + tinted icon.
 */
export function MenuIconTile({
  icon: Icon,
  tint = "slate",
  active = false,
  size = "md",
  className,
}: MenuIconTileProps) {
  const dims =
    size === "sm"
      ? "w-5 h-5 rounded-[6px]"
      : "w-6 h-6 rounded-[7px]";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 text-white transition-all",
        dims,
        TINT_BG[tint],
        active && "shadow-sm scale-[1.05]",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={iconSize} strokeWidth={2.25} />
    </span>
  );
}
