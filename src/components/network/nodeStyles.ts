// Single source of truth for network entity colors / icons / labels.
// Colors are kept as raw hex (not theme tokens) because they map to
// real-world fiber/equipment color codes that should not change with theme.

import {
  Server, Network, Zap, Grid3x3, Box, GitFork, Radio, Home, Cable,
  Router as RouterIcon, HardDrive, type LucideIcon,
} from "lucide-react";

export type NodeKind =
  | "server_room"
  | "switch"
  | "router"
  | "sfp"
  | "odf"
  | "tj_box"
  | "splitter_main"
  | "splitter_sub"
  | "olt"
  | "onu"
  | "client"
  | "pop"
  | "custom";

export interface NodeStyle {
  label: string;
  color: string;       // border / marker color
  bg: string;          // light bg for canvas chip
  icon: LucideIcon;
}

export const NODE_STYLES: Record<NodeKind, NodeStyle> = {
  server_room:   { label: "Server Room",     color: "#4F46E5", bg: "#EEF2FF", icon: Server },
  switch:        { label: "Switch",          color: "#A855F7", bg: "#FAF5FF", icon: Network },
  router:        { label: "Router",          color: "#EC4899", bg: "#FDF2F8", icon: RouterIcon },
  sfp:           { label: "SFP",             color: "#06B6D4", bg: "#ECFEFF", icon: Zap },
  odf:           { label: "ODF",             color: "#F59E0B", bg: "#FFFBEB", icon: Grid3x3 },
  tj_box:        { label: "TJ Box",          color: "#111827", bg: "#F3F4F6", icon: Box },
  splitter_main: { label: "Main Splitter",   color: "#F97316", bg: "#FFF7ED", icon: GitFork },
  splitter_sub:  { label: "Sub Splitter",    color: "#EAB308", bg: "#FEFCE8", icon: GitFork },
  olt:           { label: "OLT",             color: "#2563EB", bg: "#EFF6FF", icon: HardDrive },
  onu:           { label: "ONU",             color: "#10B981", bg: "#ECFDF5", icon: Radio },
  client:        { label: "Client",          color: "#E11D48", bg: "#FFF1F2", icon: Home },
  pop:           { label: "POP",             color: "#0EA5E9", bg: "#F0F9FF", icon: Server },
  custom:        { label: "Custom",          color: "#64748B", bg: "#F8FAFC", icon: Cable },
};

export const NODE_KIND_LIST: NodeKind[] = [
  "server_room", "switch", "router", "sfp", "odf", "tj_box",
  "splitter_main", "splitter_sub", "olt", "onu", "client", "custom",
];

// Industry standard 7-color core sequence (TIA-598).
export const CABLE_CORE_COLORS = [
  { name: "Blue",   hex: "#2563EB" },
  { name: "Orange", hex: "#F97316" },
  { name: "Green",  hex: "#10B981" },
  { name: "Brown",  hex: "#92400E" },
  { name: "Slate",  hex: "#64748B" },
  { name: "White",  hex: "#E5E7EB" },
  { name: "Red",    hex: "#DC2626" },
] as const;

export const CABLE_TYPES = [
  { value: "fiber",      label: "Fiber Cable" },
  { value: "drop_cable", label: "Drop Cable" },
  { value: "patch_cord", label: "Patch Cord" },
  { value: "copper",     label: "Copper / UTP" },
] as const;

export function styleOf(kind: string | null | undefined): NodeStyle {
  return NODE_STYLES[(kind as NodeKind)] || NODE_STYLES.custom;
}
