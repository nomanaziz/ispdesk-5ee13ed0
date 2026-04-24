import { ComponentType } from "react";
import ClassicHome from "./home/ClassicHome";
import SplitHeroHome from "./home/SplitHeroHome";
import CenteredHome from "./home/CenteredHome";
import LeftRailHome from "./home/LeftRailHome";
import MinimalHome from "./home/MinimalHome";

import ClassicPackages from "./packages/ClassicPackages";
import GalaxyStylePackages from "./packages/GalaxyStylePackages";
import CompactPackages from "./packages/CompactPackages";
import CardFlipPackages from "./packages/CardFlipPackages";
import TablePackages from "./packages/TablePackages";

export interface TemplateMeta {
  key: string;
  name: string;
  description: string;
  Component: ComponentType<any>;
}

export const HOME_TEMPLATES: Record<string, TemplateMeta> = {
  classic:      { key: "classic",     name: "Classic Cyan",  description: "ক্লাসিক ডার্ক হিরো + ফিচার গ্রিড।",        Component: ClassicHome },
  "split-hero": { key: "split-hero",  name: "Split Hero",     description: "বাম দিকে ভিজ্যুয়াল, ডানে কনটেন্ট।",        Component: SplitHeroHome },
  centered:     { key: "centered",    name: "Centered Bold",  description: "মধ্যে বড় টাইপোগ্রাফি, মিনিমাল।",            Component: CenteredHome },
  "left-rail":  { key: "left-rail",   name: "Left Rail",      description: "বামে সাইডবার, ডানে মূল কনটেন্ট।",            Component: LeftRailHome },
  minimal:      { key: "minimal",     name: "Minimal",        description: "প্রচুর ফাঁকা জায়গা, এডিটোরিয়াল লুক।",       Component: MinimalHome },
};

export const PACKAGE_TEMPLATES: Record<string, TemplateMeta> = {
  classic:  { key: "classic",  name: "Classic Tabs",     description: "বর্তমান টাব-ভিত্তিক লেআউট।",          Component: ClassicPackages },
  galaxy:   { key: "galaxy",   name: "Galaxy Style",     description: "Wave hero + হোম/কর্পোরেট/ডেডিকেটেড।", Component: GalaxyStylePackages },
  compact:  { key: "compact",  name: "Compact Grid",     description: "ছোট কার্ড, প্রতি সারিতে ৫টি।",         Component: CompactPackages },
  cardflip: { key: "cardflip", name: "Card Flip",        description: "হোভার করলে ফ্লিপ হয়ে ফিচার দেখায়।",   Component: CardFlipPackages },
  table:    { key: "table",    name: "Comparison Table", description: "তুলনামূলক টেবিল ভিউ।",                  Component: TablePackages },
};

export const HOME_KEYS = Object.keys(HOME_TEMPLATES);
export const PACKAGE_KEYS = Object.keys(PACKAGE_TEMPLATES);
