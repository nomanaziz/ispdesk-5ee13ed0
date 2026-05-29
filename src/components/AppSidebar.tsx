import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Settings, Users, CreditCard,
  ChevronDown, ChevronRight, Activity,
  Search, X, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw,
  type LucideIcon, Network, Radio, Server,
  Wallet, UserCog, CalendarDays, Package, BarChart3,
  BookOpen, FileText, Send, Boxes, Truck, Building2,
  MapPin, Layers, Cable, Shield, Globe, Cpu,
  HardDrive, Upload, UserPlus, List, UserX, Clock,
  RefreshCw, Monitor, Landmark, Receipt, DollarSign,
  Banknote, ClipboardList, ShoppingCart, Wrench,
  Archive, Trash2, PieChart, Scale, BookMarked,
  MessageSquare, Mail, Link2, Megaphone, Cog,
  CreditCard as CreditCardIcon, Calendar, Headphones,
  CheckSquare, History, Wifi, Map, CircleDot,
  FolderOpen, Store, Tag, BarChart, FileBarChart,
  Bell, Users2, Building, Briefcase, ScrollText,
  ShoppingBag, ShieldCheck, Sparkles,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { User as UserIcon, Utensils, UtensilsCrossed, ClipboardList as ClipboardListIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuIconTile, tintForLabel } from "@/components/sidebar/MenuIconTile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import ispDeskLogo from "@/assets/isp-desk-logo.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { GROUP_MODULE, ALWAYS_VISIBLE_GROUPS } from "@/lib/menuModuleMap";
import { ITEM_MODULE } from "@/lib/menuItemModuleMap";

export interface MenuItem { title: string; url: string; icon: LucideIcon; titleEn?: string; }
export interface MenuGroup { label: string; icon: LucideIcon; items: MenuItem[]; defaultOpen?: boolean; direct?: boolean; labelEn?: string; color?: string; }


// Rainbow candy-tone color per group label. Light: -600, Dark: -400 for readability.
const GROUP_COLORS: Record<string, string> = {
  "Dashboard": "text-indigo-600 dark:text-indigo-400",
  "Website Panel": "text-sky-600 dark:text-sky-400",
  "Configuration": "text-slate-600 dark:text-slate-300",
  "VAS": "text-teal-600 dark:text-teal-400",
  "হোম ক্লায়েন্ট": "text-blue-600 dark:text-blue-400",
  "POP / MAC ক্লায়েন্ট": "text-violet-600 dark:text-violet-400",
  "Bandwidth Clients": "text-cyan-600 dark:text-cyan-400",
  "Devices": "text-emerald-600 dark:text-emerald-400",
  "HR & Payroll": "text-pink-600 dark:text-pink-400",
  "অ্যাক্সেস ম্যানেজমেন্ট": "text-indigo-700 dark:text-indigo-300",
  "OLT ম্যানেজমেন্ট": "text-purple-600 dark:text-purple-400",
  "Network Monitoring": "text-green-600 dark:text-green-400",
  "Network Diagram": "text-lime-600 dark:text-lime-400",
  "ছুটি ম্যানেজমেন্ট": "text-amber-600 dark:text-amber-400",
  "ইভেন্ট ও ছুটি": "text-yellow-600 dark:text-yellow-400",
  "Support & Ticketing": "text-rose-600 dark:text-rose-400",
  "Task Management": "text-fuchsia-600 dark:text-fuchsia-400",
  "Bandwidth Purchase": "text-cyan-700 dark:text-cyan-300",
  "Purchase": "text-orange-600 dark:text-orange-400",
  "Sales & Service": "text-red-600 dark:text-red-400",
  "Inventory": "text-amber-700 dark:text-amber-300",
  "Assets": "text-stone-600 dark:text-stone-300",
  "Accounting": "text-green-700 dark:text-green-300",
  "Reports": "text-blue-700 dark:text-blue-300",
  "SMS Service": "text-sky-700 dark:text-sky-300",
  "E-Commerce": "text-pink-700 dark:text-pink-300",
  "System": "text-zinc-600 dark:text-zinc-300",
};

function getGroupColor(group: MenuGroup): string {
  return group.color ?? GROUP_COLORS[group.label] ?? "text-muted-foreground";
}

export const menuGroups: MenuGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "লিংক", url: "/dashboard/links", icon: Link2 },
    ],
  },
  {
    label: "All Clients",
    icon: Users,
    items: [
      { title: "নতুন রিকোয়েস্ট", url: "/dashboard/clients/new-request", icon: MessageSquare },
      { title: "হোম ক্লায়েন্ট", url: "/dashboard/clients/home", icon: UserPlus },
      { title: "কর্পোরেট ক্লায়েন্ট", url: "/dashboard/clients/corporate", icon: Building2 },
      { title: "বিলিং তালিকা", url: "/dashboard/billing", icon: CreditCard },
      { title: "বাল্ক ইনভয়েস জেনারেট", url: "/dashboard/billing/bulk-generate", icon: FileText },
      { title: "দৈনিক বিল কালেকশন", url: "/dashboard/billing/daily-collection", icon: Wallet },
      { title: "ইনস্টলেশন ফি", url: "/dashboard/sales/installation-fee", icon: DollarSign },
      { title: "চলে যাওয়া ক্লায়েন্ট", url: "/dashboard/clients/left", icon: UserX },
      { title: "শিডিউলার", url: "/dashboard/clients/scheduler", icon: Clock },
      { title: "পরিবর্তন রিকোয়েস্ট", url: "/dashboard/clients/change-request", icon: RefreshCw },
      { title: "পোর্টাল ম্যানেজ", url: "/dashboard/clients/portal-manage", icon: Monitor },
      { title: "আপডেট রিকোয়েস্ট", url: "/dashboard/clients/update-requests", icon: ShieldCheck },
    ],
  },
  {
    label: "POP / MAC ক্লায়েন্ট",
    icon: Radio,
    items: [
      { title: "POP ম্যানেজার লিস্ট", url: "/dashboard/branches/managers", icon: Users },
      { title: "ট্যারিফ কনফিগ", url: "/dashboard/branches/tariff", icon: Settings },
      { title: "POP ফান্ডিং", url: "/dashboard/branches/funding", icon: Banknote },
      { title: "PGW ট্রানজেকশন", url: "/dashboard/branches/pgw-transactions", icon: CreditCardIcon },
    ],
  },
  {
    label: "Bandwidth Clients",
    icon: Wifi,
    items: [
      { title: "POP / কাস্টমার", url: "/dashboard/bw-sale/pop", icon: Radio },
      { title: "সার্ভিস ক্যাটালগ", url: "/dashboard/bw-sale/services", icon: Layers },
      { title: "বিক্রয় ইনভয়েস", url: "/dashboard/bw-sale/invoices", icon: FileText },
      { title: "বিল কালেকশন", url: "/dashboard/bw-sale/collection", icon: Wallet },
      { title: "রিকারিং ইনভয়েস", url: "/dashboard/bw-sale/recurring", icon: RefreshCw },
      { title: "প্যানেল সাবস্ক্রিপশন প্রাইসিং", url: "/dashboard/bw-sale/panel-pricing", icon: Sparkles },
    ],
  },
  {
    label: "Support & Ticketing",
    icon: Headphones,
    items: [
      { title: "ক্লায়েন্ট সাপোর্ট", url: "/dashboard/support/tickets", icon: Headphones },
      { title: "সাপোর্ট হিস্টরি", url: "/dashboard/support/history", icon: History },
      { title: "নোটিশ", url: "/dashboard/support/notices", icon: Bell },
    ],
  },
  {
    label: "Accounting",
    icon: BarChart3,
    items: [
      { title: "Dashboard", url: "/dashboard/accounting", icon: PieChart },
      { title: "চার্ট অফ অ্যাকাউন্টস", url: "/dashboard/accounting/chart", icon: BookOpen },
      { title: "আয়", url: "/dashboard/accounting/income", icon: DollarSign },
      { title: "ব্যয়", url: "/dashboard/accounting/expense", icon: Banknote },
      { title: "জার্নাল", url: "/dashboard/accounting/journal", icon: BookMarked },
      { title: "লেনদেন", url: "/dashboard/accounting/transactions", icon: Receipt },
      { title: "অ্যাকাউন্ট ব্যালেন্স", url: "/dashboard/accounting/balances", icon: Scale },
      { title: "ব্যালেন্স শীট", url: "/dashboard/accounting/balance-sheet", icon: FileBarChart },
      { title: "লাভ-ক্ষতি", url: "/dashboard/accounting/profit-loss", icon: BarChart3 },
      { title: "P&L তুলনা", url: "/dashboard/accounting/compare-pl", icon: BarChart },
      { title: "ট্রায়াল ব্যালেন্স", url: "/dashboard/accounting/trial-balance", icon: Scale },
      { title: "ক্যাশ বুক", url: "/dashboard/accounting/cash-book", icon: BookOpen },
      { title: "মূলধন ড্যাশবোর্ড", url: "/dashboard/accounting/capital", icon: PieChart },
      { title: "মূলধন অবদানকারী", url: "/dashboard/accounting/capital/contributors", icon: Users },
      { title: "মূলধন লেনদেন", url: "/dashboard/accounting/capital/transactions", icon: Receipt },
      { title: "কিস্তি সূচি", url: "/dashboard/accounting/capital/schedule", icon: BookMarked },
    ],
  },
  {
    label: "HR & Payroll",
    icon: UserCog,
    items: [
      { title: "কর্মী আবেদন কেন্দ্র", url: "/dashboard/hr/employee-hub", icon: ClipboardList },
      { title: "পেরোল", url: "/dashboard/hr/payroll", icon: Wallet },
      { title: "পে-স্লিপ", url: "/dashboard/hr/payslip", icon: FileText },
      { title: "কর্মচারী তালিকা", url: "/dashboard/hr/employees", icon: Users },
      { title: "বেতন শীট", url: "/dashboard/hr/salary-sheet", icon: ScrollText },
      { title: "অগ্রিম বেতন", url: "/dashboard/hr/advance-salary", icon: Wallet },
      { title: "Employee Loan", url: "/dashboard/hr/loans", icon: DollarSign },
      { title: "রিজাইনেশন", url: "/dashboard/hr/resignations", icon: UserX },
      { title: "উপস্থিতি", url: "/dashboard/hr/attendance", icon: CheckSquare },
      { title: "ছুটি ম্যানেজমেন্ট", url: "/dashboard/hr/leave", icon: CalendarDays },
      { title: "ইভেন্ট ও ছুটি", url: "/dashboard/hr/events-holidays", icon: Calendar },
      { title: "কনভেয়েন্স বিল", url: "/dashboard/hr/conveyance-bills", icon: DollarSign },
      { title: "আমার কনভেয়েন্স", url: "/dashboard/hr/my-conveyance", icon: Wallet },
      { title: "ক্যাটারিং", url: "/dashboard/hr/catering", icon: UtensilsCrossed },
      { title: "HR সেটিংস", url: "/dashboard/hr/settings", icon: Settings },
    ],
  },
  {
    label: "OLT ম্যানেজমেন্ট",
    icon: Cpu,
    items: [
      { title: "OLT / ONU ওভারভিউ", url: "/dashboard/olt-overview", icon: Cpu },
      { title: "OLT ডিভাইস", url: "/dashboard/olt", icon: Server },
      { title: "OLT Power Dashboard", url: "/dashboard/olt/power-dashboard", icon: Activity },
      { title: "Online Client Monitoring", url: "/dashboard/olt/online-monitoring", icon: Wifi },
      { title: "ONU তালিকা", url: "/dashboard/olt/onu", icon: List },
      { title: "OLT ইউজার", url: "/dashboard/olt/users", icon: Users },
      { title: "OLT Port Classification", url: "/dashboard/olt/ports", icon: Network },
      { title: "ইউজার ডাউন কাউন্ট", url: "/dashboard/olt/user-down", icon: UserX },
      { title: "ফাইবার ডাউন ফাইন্ডার", url: "/dashboard/olt/fiber-down", icon: Cable },
      { title: "OLT শেয়ারিং", url: "/dashboard/olt/sharing", icon: Link2 },
    ],
  },
  {
    label: "Network Monitoring",
    icon: Activity,
    items: [
      { title: "অনলাইন মনিটরিং", url: "/dashboard/monitoring/online", icon: Wifi },
      { title: "Live Traffic", url: "/dashboard/monitoring/live-traffic", icon: Activity },
      { title: "Switch ম্যানেজমেন্ট", url: "/dashboard/network/switches", icon: Network },
      { title: "POP DASS", url: "/dashboard/monitoring/pop-dass", icon: Monitor },
      { title: "POP IP", url: "/dashboard/monitoring/pop-ip", icon: Globe },
      { title: "POP লগ", url: "/dashboard/monitoring/pop-log", icon: ScrollText },
      { title: "Ping টুলস", url: "/dashboard/monitoring/ping-tools", icon: Wifi },
      { title: "POP ডিভাইস", url: "/dashboard/monitoring/pop-devices", icon: Radio },
    ],
  },
  {
    label: "Network Diagram",
    icon: Network,
    items: [
      { title: "ডায়াগ্রাম", url: "/dashboard/network/diagram", icon: Network },
      { title: "নেটওয়ার্ক POP", url: "/dashboard/network/pop", icon: Radio },
      { title: "ডায়াগ্রামে ক্লায়েন্ট", url: "/dashboard/network/clients", icon: Users },
      { title: "নেটওয়ার্ক কানেকশন", url: "/dashboard/network/connections", icon: Cable },
      { title: "বিতরণকৃত আইটেম", url: "/dashboard/network/distributed-items", icon: Boxes },
      { title: "ম্যাপে নেটওয়ার্ক", url: "/dashboard/network/map", icon: Map },
    ],
  },
  {
    label: "Devices",
    icon: ShieldCheck,
    items: [
      { title: "Dashboard", url: "/dashboard/device-admin", icon: LayoutDashboard },
      { title: "ডিভাইস ইনভেন্টরি", url: "/dashboard/device-admin/devices", icon: Server },
      { title: "OID Library", url: "/dashboard/device-admin/oid-library", icon: Server },
      { title: "Polling Agents", url: "/dashboard/device-admin/polling-agents", icon: Server },
      { title: "MikroTik PPPoE", url: "/dashboard/mikrotik/servers", icon: Server },
      { title: "অল ডিভাইস ইউজার", url: "/dashboard/device-admin/users", icon: Users },
      { title: "জব ম্যানেজমেন্ট", url: "/dashboard/device-admin/jobs", icon: Briefcase },
      { title: "ইউজার গ্রুপ", url: "/dashboard/device-admin/groups", icon: Users2 },
      { title: "ব্যাকআপ সেন্টার", url: "/dashboard/device-admin/backups", icon: HardDrive },
      { title: "শিডিউল ম্যানেজার", url: "/dashboard/device-admin/schedules", icon: Clock },
      { title: "অডিট লগ", url: "/dashboard/device-admin/audit-log", icon: ScrollText },
    ],
  },
  {
    label: "Task Management",
    icon: CheckSquare,
    items: [
      { title: "টাস্ক", url: "/dashboard/tasks", icon: CheckSquare },
      { title: "টাস্ক হিস্টরি", url: "/dashboard/tasks/history", icon: History },
    ],
  },
  {
    label: "Bandwidth Purchase",
    icon: Wifi,
    items: [
      { title: "আইটেম", url: "/dashboard/bw-buy/items", icon: Package },
      { title: "আইটেম ক্যাটাগরি", url: "/dashboard/bw-buy/categories", icon: FolderOpen },
      { title: "প্রোভাইডার", url: "/dashboard/bw-buy/providers", icon: Building2 },
      { title: "সাবস্ক্রিপশন", url: "/dashboard/bw-buy/subscriptions", icon: Wifi },
      { title: "ক্রয় বিল", url: "/dashboard/bw-buy/bills", icon: Receipt },
    ],
  },
  {
    label: "Reports",
    icon: FileBarChart,
    items: [
      { title: "বিল কালেকশন", url: "/dashboard/reports/bill-collection", icon: Wallet },
      { title: "ছাড় রিপোর্ট", url: "/dashboard/reports/discount", icon: Tag },
      { title: "কাস্টমার রিপোর্ট", url: "/dashboard/reports/customer", icon: Users },
      { title: "মেসেজ রিপোর্ট", url: "/dashboard/reports/messages", icon: MessageSquare },
      { title: "বকেয়া কাস্টমার SMS", url: "/dashboard/reports/due-sms", icon: Send },
      { title: "প্রসেসিং ফি", url: "/dashboard/reports/processing-fee", icon: DollarSign },
      { title: "BTRC মাসিক রিপোর্ট", url: "/dashboard/reports/btrc", icon: Landmark },
      { title: "আর্থিক লেনদেন", url: "/dashboard/reports/financial", icon: BarChart3 },
    ],
  },
  {
    label: "SMS Service",
    icon: Send,
    items: [
      { title: "ব্যক্তিগত SMS", url: "/dashboard/sms/individual", icon: MessageSquare },
      { title: "SMS টেমপ্লেট", url: "/dashboard/sms/templates", icon: FileText },
      { title: "SMS গ্রুপ", url: "/dashboard/sms/groups", icon: Users2 },
      { title: "SMS পাঠান", url: "/dashboard/sms/send", icon: Send },
      { title: "SMS গেটওয়ে", url: "/dashboard/sms/gateway", icon: Cog },
      { title: "Telegram বট", url: "/dashboard/sms/telegram", icon: Send },
    ],
  },
  {
    label: "E-Commerce",
    icon: ShoppingCart,
    items: [
      { title: "ক্যাটেগরি", url: "/dashboard/shop/categories", icon: FolderOpen },
      { title: "প্রোডাক্ট", url: "/dashboard/shop/products", icon: Package },
      { title: "অর্ডার", url: "/dashboard/shop/orders", icon: ShoppingBag },
      { title: "শিপিং চার্জ", url: "/dashboard/shop/shipping", icon: Truck },
      { title: "কুপন", url: "/dashboard/shop/coupons", icon: Tag },
      { title: "ওয়ারেন্টি ক্লেইম", url: "/dashboard/shop/warranty", icon: ShieldCheck },
      { title: "সেলস রিপোর্ট", url: "/dashboard/shop/reports", icon: BarChart },
    ],
  },
  {
    label: "Purchase",
    icon: ShoppingCart,
    items: [
      { title: "রিকুইজিশন", url: "/dashboard/purchases/requisitions", icon: ClipboardList },
      { title: "ক্রয়", url: "/dashboard/purchases", icon: ShoppingCart },
      { title: "ক্রয় বিল", url: "/dashboard/purchases/bills", icon: Receipt },
    ],
  },
  {
    label: "Sales & Service",
    icon: Receipt,
    items: [
      { title: "প্রোডাক্ট ইনভয়েস", url: "/dashboard/sales/product-invoice", icon: FileText },
      { title: "সার্ভিস ইনভয়েস", url: "/dashboard/sales/service-invoice", icon: FileText },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    items: [
      { title: "ইউনিট", url: "/dashboard/inventory/units", icon: CircleDot },
      { title: "স্টোর লোকেশন", url: "/dashboard/inventory/locations", icon: Store },
      { title: "আইটেম ক্যাটাগরি", url: "/dashboard/inventory/categories", icon: FolderOpen },
      { title: "আইটেম", url: "/dashboard/inventory/items", icon: Package },
      { title: "স্টক", url: "/dashboard/inventory/stock", icon: Archive },
    ],
  },
  {
    label: "Assets",
    icon: Archive,
    items: [
      { title: "অ্যাসেট তালিকা", url: "/dashboard/assets", icon: Archive },
      { title: "নষ্ট আইটেম", url: "/dashboard/assets/destroyed", icon: Trash2 },
    ],
  },
  {
    label: "Website Panel",
    icon: Globe,
    items: [
      { title: "ওয়েবসাইট ড্যাশবোর্ড", url: "/dashboard/website", icon: Globe },
      { title: "হোমপেজ এডিটর", url: "/dashboard/website/homepage", icon: Monitor },
      { title: "পেজ", url: "/dashboard/website/pages", icon: FileText },
      { title: "নোটিশ", url: "/dashboard/website/notices", icon: Bell },
      { title: "অফার", url: "/dashboard/website/offers", icon: Tag },
      { title: "টেস্টিমোনিয়াল", url: "/dashboard/website/testimonials", icon: MessageSquare },
      { title: "পার্টনার", url: "/dashboard/website/partners", icon: Link2 },
      { title: "ফিচার", url: "/dashboard/website/features", icon: Layers },
      { title: "সার্ভিস", url: "/dashboard/website/services", icon: Wrench },
      { title: "উৎসব", url: "/dashboard/website/festivals", icon: Megaphone },
      { title: "মেনু এডিটর", url: "/dashboard/website/menu", icon: List },
      { title: "মিডিয়া লাইব্রেরি", url: "/dashboard/website/media", icon: FolderOpen },
      { title: "About Page", url: "/dashboard/website/about", icon: BookOpen },
      { title: "সাইট সেটিংস", url: "/dashboard/website/settings", icon: Cog },
    ],
  },
  {
    label: "Configuration",
    icon: Settings,
    items: [
      { title: "জোন", url: "/dashboard/config/zones", icon: MapPin },
      { title: "সাব জোন", url: "/dashboard/config/sub-zones", icon: Layers },
      { title: "বক্স", url: "/dashboard/config/boxes", icon: Boxes },
      { title: "কানেকশন টাইপ", url: "/dashboard/config/connection-types", icon: Cable },
      { title: "ক্লায়েন্ট টাইপ", url: "/dashboard/config/client-types", icon: Users },
      { title: "প্রোটোকল টাইপ", url: "/dashboard/config/protocol-types", icon: Shield },
      { title: "বিলিং স্ট্যাটাস", url: "/dashboard/config/billing-statuses", icon: Tag },
      { title: "প্যাকেজ", url: "/dashboard/config/packages", icon: Package },
      { title: "এলাকা (বিভাগ/জেলা/উপজেলা)", url: "/dashboard/config/locations", icon: MapPin },
      { title: "সার্ভিস টাইপ", url: "/dashboard/config/service-types", icon: Wrench },
    ],
  },
  {
    label: "System",
    icon: Cog,
    items: [
      { title: "সিস্টেম সেটআপ", url: "/dashboard/system/setup", icon: Settings },
      { title: "অ্যাপ ইউজার", url: "/dashboard/access/app-users", icon: Users },
      { title: "রোল ও পারমিশন", url: "/dashboard/access/roles", icon: Shield },
      { title: "বিল পিরিয়ড", url: "/dashboard/system/bill-period-years", icon: CalendarDays },
      { title: "পিরিয়ড সেটআপ", url: "/dashboard/system/periods", icon: Calendar },
      { title: "কোম্পানি সেটআপ", url: "/dashboard/system/company", icon: Building },
      { title: "ইনভয়েস সেটআপ", url: "/dashboard/system/invoice", icon: FileText },
      { title: "ইমেইল সেটআপ", url: "/dashboard/system/email", icon: Mail },
      { title: "পেমেন্ট গেটওয়ে", url: "/dashboard/system/payment-gateways", icon: CreditCardIcon },
      { title: "প্রসেসিং ফি", url: "/dashboard/system/processing-fee", icon: DollarSign },
      { title: "অটোমেটিক প্রসেস", url: "/dashboard/system/automatic-process", icon: Activity },
      { title: "Portal Branding", url: "/dashboard/system/portal-branding", icon: Activity },
      { title: "নোটিফিকেশন প্রোভাইডার", url: "/dashboard/system/notification-providers", icon: Bell },
      { title: "নোটিফিকেশন টেমপ্লেট", url: "/dashboard/system/notification-templates", icon: Mail },
      { title: "নোটিফিকেশন লগ", url: "/dashboard/system/notification-logs", icon: ScrollText },
      { title: "সিস্টেম লগ", url: "/dashboard/system/system-log", icon: ScrollText },
      { title: "কাস্টম ডোমেইন", url: "/dashboard/system/custom-domain", icon: Globe },
      { title: "আমার সাবস্ক্রিপশন", url: "/dashboard/my-subscription", icon: CreditCardIcon },
      { title: "বিলিং সাইকেল সেটিংস", url: "/dashboard/billing/cycle-settings", icon: Cog },
    ],
  },
  {
    label: "VAS",
    icon: Wrench,
    items: [
      { title: "VAS কনফিগ", url: "/dashboard/vas/config", icon: Cog },
      { title: "সাবস্ক্রিপশন", url: "/dashboard/vas/subscriptions", icon: Users },
      { title: "লেনদেন", url: "/dashboard/vas/transactions", icon: History },
    ],
  },
];

// Bangla → English translations for sidebar group labels and menu item titles.
// Default UI is Bangla; lookup returns English when language toggled.
export const SIDEBAR_EN: Record<string, string> = {
  // Group labels
  "Dashboard": "Dashboard",
  "Website Panel": "Website Panel",
  "Configuration": "Configuration",
  "VAS": "VAS",
  "All Clients": "All Clients",
  "হোম ক্লায়েন্ট": "Home Clients",
  "POP / MAC ক্লায়েন্ট": "POP / MAC Clients",
  "Bandwidth Clients": "Bandwidth Clients",
  "Devices": "Devices",
  "HR & Payroll": "HR & Payroll",
  "OLT ম্যানেজমেন্ট": "OLT Management",
  "Network Monitoring": "Network Monitoring",
  "Network Diagram": "Network Diagram",
  "ছুটি ম্যানেজমেন্ট": "Leave Management",
  "ইভেন্ট ও ছুটি": "Events & Holidays",
  "Support & Ticketing": "Support & Ticketing",
  "Task Management": "Task Management",
  "Bandwidth Purchase": "Bandwidth Purchase",
  "ক্রয়": "Purchase",
  "Sales & Service": "Sales & Services",
  "Inventory": "Inventory",
  "Assets": "Assets",
  "Accounting": "Accounting",
  "Reports": "Reports",
  "SMS Service": "SMS Service",
  "E-Commerce": "E-Commerce",
  "System": "System",

  // Common item titles
  "ওয়েবসাইট ড্যাশবোর্ড": "Website Dashboard",
  "হোমপেজ এডিটর": "Homepage Editor",
  "পেজ": "Pages",
  "নোটিশ": "Notices",
  "অফার": "Offers",
  "টেস্টিমোনিয়াল": "Testimonials",
  "পার্টনার": "Partners",
  "ফিচার": "Features",
  "সার্ভিস": "Services",
  "উৎসব": "Festivals",
  "মেনু এডিটর": "Menu Editor",
  "মিডিয়া লাইব্রেরি": "Media Library",
  "About Page": "About Page",
  "সাইট সেটিংস": "Site Settings",
  "জোন": "Zones",
  "সাব জোন": "Sub Zones",
  "বক্স": "Boxes",
  "কানেকশন টাইপ": "Connection Types",
  "ক্লায়েন্ট টাইপ": "Client Types",
  "প্রোটোকল টাইপ": "Protocol Types",
  "বিলিং স্ট্যাটাস": "Billing Statuses",
  "প্যাকেজ": "Packages",
  "এলাকা (বিভাগ/জেলা/উপজেলা)": "Areas (Division/District/Upazila)",
  "সার্ভিস টাইপ": "Service Types",
  "VAS কনফিগ": "VAS Config",
  "সাবস্ক্রিপশন": "Subscriptions",
  "লেনদেন": "Transactions",
  "নতুন রিকোয়েস্ট": "New Requests",
  "ক্লায়েন্ট তালিকা": "Client List",
  "বিলিং তালিকা": "Billing List",
  "দৈনিক বিল কালেকশন": "Daily Bill Collection",
  "ইনস্টলেশন ফি": "Installation Fee",
  "চলে যাওয়া ক্লায়েন্ট": "Left Clients",
  "শিডিউলার": "Scheduler",
  "পরিবর্তন রিকোয়েস্ট": "Change Requests",
  "পোর্টাল ম্যানেজ": "Portal Manage",
  "আপডেট রিকোয়েস্ট": "Update Requests",
  "POP ম্যানেজার লিস্ট": "POP Manager List",
  "ট্যারিফ কনফিগ": "Tariff Config",
  "POP ফান্ডিং": "POP Funding",
  "PGW ট্রানজেকশন": "PGW Transactions",
  "POP নোটিশ": "POP Notices",
  "POP / কাস্টমার": "POP / Customer",
  "সার্ভিস ক্যাটালগ": "Service Catalog",
  "বিক্রয় ইনভয়েস": "Sales Invoices",
  "বিল কালেকশন": "Bill Collection",
  "রিকারিং ইনভয়েস": "Recurring Invoices",
  "ডিভাইস ইনভেন্টরি": "Device Inventory",
  "অল ডিভাইস ইউজার": "All Device Users",
  "জব ম্যানেজমেন্ট": "Job Management",
  "ইউজার গ্রুপ": "User Groups",
  "ব্যাকআপ সেন্টার": "Backup Center",
  "শিডিউল ম্যানেজার": "Schedule Manager",
  "অডিট লগ": "Audit Log",
  "ডিপার্টমেন্ট": "Departments",
  "পে-হেড": "Pay Heads",
  "পেরোল": "Payroll",
  "পদবী": "Positions",
  "পে-স্লিপ": "Pay Slip",
  "কর্মচারী তালিকা": "Employees",
  "বেতন শীট": "Salary Sheet",
  "রিজাইন নিয়ম": "Resignation Rules",
  "রিজাইনেশন": "Resignations",
  "উপস্থিতি": "Attendance",
  "শিফট ম্যানেজমেন্ট": "Shift Management",
  "ZKTeco ডিভাইস": "ZKTeco Devices",
  "উপস্থিতি নিয়ম": "Attendance Rules",
  "HR সেটিংস": "HR Settings",
  "OLT / ONU ওভারভিউ": "OLT / ONU Overview",
  "OLT ডিভাইস": "OLT Devices",
  "ONU তালিকা": "ONU List",
  "OLT ইউজার": "OLT Users",
  "ইউজার ডাউন কাউন্ট": "User Down Count",
  "ফাইবার ডাউন ফাইন্ডার": "Fiber Down Finder",
  "OLT শেয়ারিং": "OLT Sharing",
  "অনলাইন মনিটরিং": "Online Monitoring",
  "Switch ম্যানেজমেন্ট": "Switch Management",
  "POP লগ": "POP Log",
  "Ping টুলস": "Ping Tools",
  "POP ডিভাইস": "POP Devices",
  "ডায়াগ্রাম": "Diagram",
  "নেটওয়ার্ক POP": "Network POP",
  "ডায়াগ্রামে ক্লায়েন্ট": "Clients on Diagram",
  "নেটওয়ার্ক কানেকশন": "Network Connections",
  "বিতরণকৃত আইটেম": "Distributed Items",
  "ম্যাপে নেটওয়ার্ক": "Network on Map",
  "ক্যাটাগরি": "Categories",
  "সেটআপ": "Setup",
  "অনুমোদন": "Approval",
  "ক্লায়েন্ট সাপোর্ট": "Client Support",
  "সাপোর্ট হিস্টরি": "Support History",
  "টাস্ক": "Tasks",
  "টাস্ক হিস্টরি": "Task History",
  "আইটেম": "Items",
  "আইটেম ক্যাটাগরি": "Item Categories",
  "প্রোভাইডার": "Providers",
  "ক্রয় বিল": "Purchase Bills",
  "রিকুইজিশন": "Requisitions",
  "প্রোডাক্ট ইনভয়েস": "Product Invoice",
  "সার্ভিস ইনভয়েস": "Service Invoice",
  "ইউনিট": "Units",
  "স্টোর লোকেশন": "Store Locations",
  "স্টক": "Stock",
  "অ্যাসেট তালিকা": "Asset List",
  "নষ্ট আইটেম": "Destroyed Items",
  "চার্ট অফ অ্যাকাউন্টস": "Chart of Accounts",
  "আয়": "Income",
  "ব্যয়": "Expense",
  "জার্নাল": "Journal",
  "অ্যাকাউন্ট ব্যালেন্স": "Account Balance",
  "ব্যালেন্স শীট": "Balance Sheet",
  "লাভ-ক্ষতি": "Profit & Loss",
  "P&L তুলনা": "P&L Compare",
  "ট্রায়াল ব্যালেন্স": "Trial Balance",
  "ক্যাশ বুক": "Cash Book",
  "ছাড় রিপোর্ট": "Discount Report",
  "কাস্টমার রিপোর্ট": "Customer Report",
  "মেসেজ রিপোর্ট": "Message Report",
  "বকেয়া কাস্টমার SMS": "Due Customer SMS",
  "প্রসেসিং ফি": "Processing Fee",
  "BTRC মাসিক রিপোর্ট": "BTRC Monthly Report",
  "আর্থিক লেনদেন": "Financial Transactions",
  "ব্যক্তিগত SMS": "Individual SMS",
  "SMS টেমপ্লেট": "SMS Templates",
  "SMS গ্রুপ": "SMS Groups",
  "SMS পাঠান": "Send SMS",
  "SMS গেটওয়ে": "SMS Gateway",
  "ক্যাটেগরি": "Categories",
  "প্রোডাক্ট": "Products",
  "অর্ডার": "Orders",
  "শিপিং চার্জ": "Shipping Charges",
  "কুপন": "Coupons",
  "ওয়ারেন্টি ক্লেইম": "Warranty Claims",
  "সেলস রিপোর্ট": "Sales Report",
  "অ্যাপ ইউজার": "App Users",
  "রোল": "Roles",
  "OLT পারমিশন": "OLT Permissions",
  "কোম্পানি সেটআপ": "Company Setup",
  "ইনভয়েস সেটআপ": "Invoice Setup",
  "পিরিয়ড সেটআপ": "Period Setup",
  "পেমেন্ট গেটওয়ে": "Payment Gateways",
  "ইমেইল সেটআপ": "Email Setup",
  "সিস্টেম সেটআপ": "System Setup",
  "বিলিং সাইকেল সেটিংস": "Billing Cycle Settings",
  "সিস্টেম লগ": "System Log",
  "কাস্টম ডোমেইন": "Custom Domain",
  "আমার সাবস্ক্রিপশন": "My Subscription",
};

function tr(label: string, lang: "bn" | "en"): string {
  if (lang === "bn") return label;
  return SIDEBAR_EN[label] ?? label;
}

function CollapsibleGroup({ group, forceOpen, openKey, onToggle }: { group: MenuGroup; forceOpen?: boolean; openKey?: string | null; onToggle?: (key: string) => void }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { resolvedMode } = useTheme();
  const { lang } = useLanguage();
  const isLight = resolvedMode === "light";
  const { data: badges } = useSidebarBadges();
  const groupLabel = tr(group.label, lang);
  const isActiveGroup = group.items.some(item =>
    item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url)
  );
  // Parent-controlled single-open mode when openKey/onToggle provided; fallback to local state otherwise.
  const isControlled = onToggle !== undefined;
  const [localOpen, setLocalOpen] = useState(group.defaultOpen || isActiveGroup);
  const controlledOpen = openKey === group.label;
  const open = isControlled ? controlledOpen : localOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onToggle!(group.label);
    else setLocalOpen(v);
  };
  const effectiveOpen = forceOpen ?? open;

  // Sum of badge counts for items inside this group (used in collapsed mode + group label)
  const groupBadgeCount = group.items.reduce((sum, it) => sum + (badges?.[it.url] || 0), 0);
  const primaryItem = group.items[0];
  const groupColor = getGroupColor(group);

  if (group.direct && primaryItem) {
    const isActive = primaryItem.url === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(primaryItem.url);

    if (collapsed) {
      return (
        <div className="px-2 py-1">
          <NavLink
            to={primaryItem.url}
            className={cn("relative flex items-center justify-center w-10 h-10 rounded-lg mb-0.5 transition-colors",
              isActive
                ? "bg-primary/15 text-primary"
                : isLight ? "text-muted-foreground hover:text-primary hover:bg-primary/5" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
            title={groupLabel}
          >
            <MenuIconTile icon={group.icon} tint={tintForLabel(group.label)} active={isActive} />
            {groupBadgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
              </span>
            )}
          </NavLink>
        </div>
      );
    }

    return (
      <div className="mb-0.5 px-2">
        <NavLink
          to={primaryItem.url}
          className={cn(
            "relative flex items-center gap-3 px-4 py-2 text-[13px] font-semibold transition-colors rounded-lg uppercase tracking-wider",
            isActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-sidebar-primary-foreground/80"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <MenuIconTile icon={group.icon} tint={tintForLabel(group.label)} active={isActive} />
          <span className="flex-1 truncate">{groupLabel}</span>
          {groupBadgeCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
            </span>
          )}
        </NavLink>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        {group.items.slice(0, 1).map((item) => {
          const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
          return (
            <NavLink key={item.url} to={item.url}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-lg mb-0.5 transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )} title={groupLabel}>
              <MenuIconTile icon={group.icon} tint={tintForLabel(group.label)} active={isActive} />
              {groupBadgeCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <button onClick={() => setOpen(!open)}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold transition-colors rounded-lg mx-2 uppercase tracking-wider",
          isActiveGroup
            ? "text-sidebar-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-sidebar-primary"
            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        )} style={{ width: "calc(100% - 16px)" }}>
        <MenuIconTile icon={group.icon} tint={tintForLabel(group.label)} active={isActiveGroup} />
        <span className="flex-1 text-left truncate">{groupLabel}</span>
        {groupBadgeCount > 0 && !effectiveOpen && (
          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
          </span>
        )}
        {effectiveOpen ? <ChevronDown className="h-3 w-3 opacity-60" /> : <ChevronRight className="h-3 w-3 opacity-60" />}
      </button>
      {effectiveOpen && (
        <div className="relative ml-7 mr-2 mt-1 mb-1 pl-4 border-l border-sidebar-border/70 space-y-0.5">
          {group.items.map((item) => {
            const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
            const count = badges?.[item.url] || 0;
            const Icon = item.icon;
            return (
              <NavLink key={item.url} to={item.url}
                className={cn(
                  "group/sub relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-md transition-colors",
                  "before:absolute before:left-[-16px] before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-px before:bg-sidebar-border/70",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground font-semibold after:absolute after:left-[-17px] after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-full after:bg-sidebar-primary before:bg-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}>
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "opacity-100" : "opacity-70")} strokeWidth={2} />
                <span className="flex-1 truncate">{tr(item.title, lang)}</span>
                {count > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}




const ORDER_STORAGE_KEY = "sidebar-menu-order";

function loadSavedOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ReorderDialog({
  open,
  onOpenChange,
  currentOrder,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentOrder: string[];
  onSave: (order: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(currentOrder);

  useEffect(() => {
    if (open) setDraft(currentOrder);
  }, [open, currentOrder]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...draft];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraft(next);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onOpenChange(false)}>
      <div
        className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-base">মেনু সাজান</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {draft.map((label, idx) => {
              const group = menuGroups.find((g) => g.label === label);
              if (!group) return null;
              const Icon = group.icon;
              return (
                <div key={label} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/40 hover:bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{label}</span>
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-background disabled:opacity-30"
                    title="উপরে"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === draft.length - 1}
                    className="p-1 rounded hover:bg-background disabled:opacity-30"
                    title="নিচে"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={() => setDraft(menuGroups.map((g) => g.label))}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> ডিফল্ট
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted"
            >
              বাতিল
            </button>
            <button
              onClick={() => {
                onSave(draft);
                onOpenChange(false);
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              সংরক্ষণ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { resolvedMode } = useTheme();
  const { lang } = useLanguage();
  const isLight = resolvedMode === "light";
  const [search, setSearch] = useState("");
  const [reorderOpen, setReorderOpen] = useState(false);
  const [savedOrder, setSavedOrder] = useState<string[]>(() => loadSavedOrder());
  const { data: company } = useQuery({
    queryKey: ["sidebar-company-info"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "company_info")
        .maybeSingle();
      return (data?.setting_value as any) || null;
    },
    staleTime: 60_000,
  });
  const companyLogo = company?.logo_url as string | undefined;
  const companyName = company?.name as string | undefined;
  const location = useLocation();

  // Determine which group contains the active route
  const activeGroupLabel = useMemo(() => {
    const found = menuGroups.find((g) =>
      g.items.some((it) =>
        it.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(it.url)
      )
    );
    return found?.label ?? null;
  }, [location.pathname]);

  const [openGroupKey, setOpenGroupKey] = useState<string | null>(activeGroupLabel);

  useEffect(() => {
    if (activeGroupLabel && activeGroupLabel !== openGroupKey) {
      setOpenGroupKey(activeGroupLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupLabel]);

  const handleToggleGroup = (key: string) => {
    setOpenGroupKey((prev) => (prev === key ? null : key));
  };

  const { isEmployeeOnly, isEmployee, appUser } = useEmployeeContext();

  const EMPLOYEE_GROUP: MenuGroup = {
    label: "আমার প্যানেল",
    icon: UserIcon,
    defaultOpen: true,
    items: [
      { title: "আমার ড্যাশবোর্ড", url: "/dashboard/me", icon: LayoutDashboard },
      { title: "আমার প্রোফাইল", url: "/dashboard/me/profile", icon: UserIcon },
      { title: "হাজিরা", url: "/dashboard/me/attendance", icon: Clock },
      { title: "ছুটি", url: "/dashboard/me/leave", icon: Calendar },
      { title: "পে-স্লিপ", url: "/dashboard/me/payslip", icon: FileText },
      { title: "অগ্রিম বেতন", url: "/dashboard/me/advance", icon: Wallet },
      { title: "ঋণ", url: "/dashboard/me/loan", icon: DollarSign },
      { title: "পদত্যাগ", url: "/dashboard/me/resignation", icon: UserX },
      { title: "খাবার অর্ডার", url: "/dashboard/me/meals", icon: Utensils },
      { title: "রিকুইজিশন", url: "/dashboard/me/requisitions", icon: ClipboardListIcon },
    ],
  };

  const perms = useModulePermissions();

  // "আমার প্যানেল" শুধুমাত্র Employee role যুক্ত app_user এর জন্য।
  // Super Admin / Admin / Operator (যাদের employee record নাই) এই panel দেখবে না।
  const showEmployeePanel = isEmployee || !!appUser?.employee_id;

  const orderedGroups = useMemo(() => {
    if (isEmployeeOnly) return [EMPLOYEE_GROUP];
    const baseGroups = showEmployeePanel
      ? [EMPLOYEE_GROUP, ...menuGroups]
      : [...menuGroups];

    // Permission filter:
    //  - Super Admin/Admin: সব দেখাবে
    //  - Always-visible group (e.g. employee self-service): সব item দেখাবে
    //  - অন্যথায়: প্রতিটি item ITEM_MODULE map অনুযায়ী filter; map-এ না থাকলে
    //    parent group-এর permission check fallback হিসেবে কাজ করবে।
    //  - Group তখনই দেখাবে যখন তার অন্তত একটা item allowed।
    if (perms.loading) return []; // hide until resolved
    const allowed = baseGroups
      .map((g) => {
        if (perms.isSuperAdmin) return g;
        if (ALWAYS_VISIBLE_GROUPS.has(g.label)) return g;
        // STRICT: প্রতিটি item-কে নিজস্ব ITEM_MODULE entry দিয়েই check করব।
        // Map-এ না থাকলে non-admin user item দেখবে না (permission leak ঠেকাতে)।
        const items = g.items.filter((it) => {
          const m = ITEM_MODULE[it.url];
          if (!m) return false;
          return perms.canReadItem(m.group, m.name);
        });
        if (items.length === 0) return null;
        return { ...g, items };
      })
      .filter(Boolean) as MenuGroup[];

    const allLabels = allowed.map((g) => g.label);
    const validSaved = savedOrder.filter((l) => allLabels.includes(l));
    const missing = allLabels.filter((l) => !validSaved.includes(l));
    const finalOrder = [...validSaved, ...missing];
    return finalOrder
      .map((l) => allowed.find((g) => g.label === l)!)
      .filter(Boolean);
  }, [savedOrder, isEmployeeOnly, showEmployeePanel, perms.loading, perms.isSuperAdmin, perms.map, perms.itemMap]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedGroups.map((g) => ({ group: g, matched: false }));
    return orderedGroups
      .map((g) => {
        const groupMatches =
          g.label.toLowerCase().includes(q) || tr(g.label, "en").toLowerCase().includes(q);
        const items = groupMatches
          ? g.items
          : g.items.filter(
              (i) => i.title.toLowerCase().includes(q) || tr(i.title, "en").toLowerCase().includes(q)
            );
        if (items.length === 0) return null;
        return { group: { ...g, items }, matched: true };
      })
      .filter(Boolean) as { group: MenuGroup; matched: boolean }[];
  }, [orderedGroups, search]);

  const handleSaveOrder = (order: string[]) => {
    setSavedOrder(order);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className={cn(
        "flex flex-col h-full transition-colors",
        isLight ? "bg-card text-foreground border-r border-sidebar-border" : "bg-sidebar text-sidebar-foreground"
      )}>
        <div className={cn(
          "flex items-center justify-center px-4 py-4 shrink-0",
          collapsed && "px-2",
          isLight ? "border-b border-sidebar-border" : "border-b border-white/10"
        )}>
          <img
            src={companyLogo || ispDeskLogo}
            alt={companyName || "ISP Desk"}
            className={cn(
              "object-contain shrink-0",
              collapsed ? "h-8 w-8" : "h-10 w-auto max-w-[180px]"
            )}
          />
        </div>

        {!collapsed && (
          <div className={cn("px-3 py-2 shrink-0", isLight ? "border-b border-sidebar-border" : "border-b border-white/10")}>
            <div className="relative">
              <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5", isLight ? "text-muted-foreground" : "text-slate-400")} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "bn" ? "মেনু খুঁজুন..." : "Search menu..."}
                className={cn(
                  "w-full h-8 pl-8 pr-7 text-[12px] rounded-md outline-none transition-colors",
                  isLight
                    ? "bg-muted/50 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                    : "bg-white/5 border border-white/10 focus:border-primary text-white placeholder:text-slate-500"
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className={cn("absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted", isLight ? "text-muted-foreground" : "text-slate-400")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <SidebarContent className="bg-transparent py-2">
            {filteredGroups.map(({ group, matched }) => (
              <CollapsibleGroup
                key={group.label}
                group={group}
                forceOpen={matched ? true : undefined}
                openKey={openGroupKey}
                onToggle={handleToggleGroup}
              />
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {lang === "bn" ? "কোনো মেনু পাওয়া যায়নি" : "No menu found"}
              </div>
            )}
          </SidebarContent>
        </ScrollArea>

        {!collapsed && (
          <div className={cn("px-3 py-2 shrink-0", isLight ? "border-t border-sidebar-border" : "border-t border-white/10")}>
            <button
              onClick={() => setReorderOpen(true)}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-8 text-[12px] rounded-md transition-colors",
                isLight
                  ? "bg-muted/50 hover:bg-muted text-foreground"
                  : "bg-white/5 hover:bg-white/10 text-slate-300"
              )}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {lang === "bn" ? "মেনু সাজান" : "Reorder menu"}
            </button>
          </div>
        )}
      </div>

      <ReorderDialog
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        currentOrder={orderedGroups.map((g) => g.label)}
        onSave={handleSaveOrder}
      />
    </Sidebar>
  );
}
