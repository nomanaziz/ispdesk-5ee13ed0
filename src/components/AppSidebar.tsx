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
  ShoppingBag, ShieldCheck,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";

interface MenuItem { title: string; url: string; icon: LucideIcon; }
interface MenuGroup { label: string; icon: LucideIcon; items: MenuItem[]; defaultOpen?: boolean; }

const menuGroups: MenuGroup[] = [
  {
    label: "ড্যাশবোর্ড",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "বিলিং ওভারভিউ", url: "/dashboard", icon: CreditCard },
      { title: "OLT / ONU ওভারভিউ", url: "/dashboard/olt-overview", icon: Cpu },
      { title: "ওয়েবসাইট ড্যাশবোর্ড", url: "/dashboard/website", icon: Globe },
    ],
  },
  {
    label: "ওয়েবসাইট প্যানেল",
    icon: Globe,
    items: [
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
      { title: "About পেজ", url: "/dashboard/website/about", icon: BookOpen },
      { title: "সাইট সেটিংস", url: "/dashboard/website/settings", icon: Cog },
    ],
  },
  {
    label: "কনফিগারেশন",
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
      { title: "বিভাগ", url: "/dashboard/config/divisions", icon: Building },
      { title: "জেলা", url: "/dashboard/config/districts", icon: Globe },
      { title: "উপজেলা", url: "/dashboard/config/upazilas", icon: MapPin },
      { title: "সার্ভিস টাইপ", url: "/dashboard/config/service-types", icon: Wrench },
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
  {
    label: "ক্লায়েন্ট",
    icon: Users,
    items: [
      { title: "নতুন রিকোয়েস্ট", url: "/dashboard/clients/new-request", icon: MessageSquare },
      { title: "নতুন যোগ করুন", url: "/dashboard/clients/add", icon: UserPlus },
      { title: "ক্লায়েন্ট তালিকা", url: "/dashboard/clients", icon: List },
      { title: "চলে যাওয়া ক্লায়েন্ট", url: "/dashboard/clients/left", icon: UserX },
      { title: "শিডিউলার", url: "/dashboard/clients/scheduler", icon: Clock },
      { title: "পরিবর্তন রিকোয়েস্ট", url: "/dashboard/clients/change-request", icon: RefreshCw },
      { title: "পোর্টাল ম্যানেজ", url: "/dashboard/clients/portal-manage", icon: Monitor },
    ],
  },
  {
    label: "বিলিং",
    icon: CreditCard,
    items: [
      { title: "বিলিং তালিকা", url: "/dashboard/billing", icon: CreditCard },
      { title: "দৈনিক বিল কালেকশন", url: "/dashboard/billing/daily-collection", icon: Wallet },
      { title: "বিলিং সাইকেল সেটিংস", url: "/dashboard/billing/cycle-settings", icon: Cog },
      { title: "ইনস্টলেশন ফি", url: "/dashboard/sales/installation-fee", icon: DollarSign },
    ],
  },
  {
    label: "MikroTik সার্ভার",
    icon: Server,
    items: [
      { title: "সার্ভার", url: "/dashboard/mikrotik/servers", icon: Server },
      { title: "সার্ভার ব্যাকআপ", url: "/dashboard/mikrotik/backup", icon: HardDrive },
      { title: "MikroTik থেকে ইম্পোর্ট", url: "/dashboard/mikrotik/import", icon: Upload },
      { title: "বাল্ক ক্লায়েন্ট ইম্পোর্ট", url: "/dashboard/mikrotik/bulk-import", icon: Users },
    ],
  },
  {
    label: "ডিভাইস",
    icon: ShieldCheck,
    items: [
      { title: "ড্যাশবোর্ড", url: "/dashboard/device-admin", icon: LayoutDashboard },
      { title: "ডিভাইস ইনভেন্টরি", url: "/dashboard/device-admin/devices", icon: Server },
      { title: "অল ডিভাইস ইউজার", url: "/dashboard/device-admin/users", icon: Users },
      { title: "জব ম্যানেজমেন্ট", url: "/dashboard/device-admin/jobs", icon: Briefcase },
      { title: "ইউজার গ্রুপ", url: "/dashboard/device-admin/groups", icon: Users2 },
      { title: "ব্যাকআপ সেন্টার", url: "/dashboard/device-admin/backups", icon: HardDrive },
      { title: "শিডিউল ম্যানেজার", url: "/dashboard/device-admin/schedules", icon: Clock },
      { title: "অডিট লগ", url: "/dashboard/device-admin/audit-log", icon: ScrollText },
    ],
  },
  {
    label: "HR ও পেরোল",
    icon: UserCog,
    items: [
      { title: "ডিপার্টমেন্ট", url: "/dashboard/hr/departments", icon: Building2 },
      { title: "পে-হেড", url: "/dashboard/hr/payheads", icon: DollarSign },
      { title: "পেরোল", url: "/dashboard/hr/payroll", icon: Wallet },
      { title: "পদবী", url: "/dashboard/hr/positions", icon: Briefcase },
      { title: "পে-স্লিপ", url: "/dashboard/hr/payslip", icon: FileText },
      { title: "কর্মচারী যোগ", url: "/dashboard/hr/employees/add", icon: UserPlus },
      { title: "কর্মচারী তালিকা", url: "/dashboard/hr/employees", icon: Users },
      { title: "বেতন শীট", url: "/dashboard/hr/salary-sheet", icon: ScrollText },
      { title: "রিজাইন নিয়ম", url: "/dashboard/hr/resign-rules", icon: FileText },
      { title: "রিজাইনেশন", url: "/dashboard/hr/resignations", icon: UserX },
      { title: "পুনরায় যোগদান", url: "/dashboard/hr/rejoin", icon: UserPlus },
      { title: "উপস্থিতি", url: "/dashboard/hr/attendance", icon: CheckSquare },
      { title: "শিফট ম্যানেজমেন্ট", url: "/dashboard/hr/shifts", icon: Clock },
      { title: "ZKTeco ডিভাইস", url: "/dashboard/hr/zkteco-devices", icon: Server },
      { title: "উপস্থিতি নিয়ম", url: "/dashboard/hr/attendance-rules", icon: Shield },
      { title: "HR সেটিংস", url: "/dashboard/hr/settings", icon: Settings },
    ],
  },
  {
    label: "OLT ম্যানেজমেন্ট",
    icon: Cpu,
    items: [
      { title: "OLT ডিভাইস", url: "/dashboard/olt", icon: Server },
      { title: "ONU তালিকা", url: "/dashboard/olt/onu", icon: List },
      { title: "OLT ইউজার", url: "/dashboard/olt/users", icon: Users },
      { title: "OLT Port Classification", url: "/dashboard/olt/ports", icon: Network },
      { title: "ইউজার ডাউন কাউন্ট", url: "/dashboard/olt/user-down", icon: UserX },
      { title: "ফাইবার ডাউন ফাইন্ডার", url: "/dashboard/olt/fiber-down", icon: Cable },
      { title: "OLT শেয়ারিং", url: "/dashboard/olt/sharing", icon: Link2 },
    ],
  },
  {
    label: "নেটওয়ার্ক মনিটরিং",
    icon: Activity,
    items: [
      { title: "অনলাইন মনিটরিং", url: "/dashboard/monitoring/online", icon: Wifi },
      { title: "Live Traffic", url: "/dashboard/monitoring/live-traffic", icon: Activity },
      { title: "সুইচ তালিকা", url: "/dashboard/monitoring/switches", icon: Network },
      { title: "সুইচ যোগ করুন", url: "/dashboard/monitoring/add-switch", icon: UserPlus },
      { title: "POP DASS", url: "/dashboard/monitoring/pop-dass", icon: Monitor },
      { title: "POP IP", url: "/dashboard/monitoring/pop-ip", icon: Globe },
      { title: "POP লগ", url: "/dashboard/monitoring/pop-log", icon: ScrollText },
      { title: "Ping টুলস", url: "/dashboard/monitoring/ping-tools", icon: Wifi },
      { title: "POP ডিভাইস", url: "/dashboard/monitoring/pop-devices", icon: Radio },
    ],
  },
  {
    label: "নেটওয়ার্ক ডায়াগ্রাম",
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
    label: "ছুটি ম্যানেজমেন্ট",
    icon: CalendarDays,
    items: [
      { title: "ক্যাটাগরি", url: "/dashboard/leave/categories", icon: FolderOpen },
      { title: "সেটআপ", url: "/dashboard/leave/setup", icon: Settings },
      { title: "আবেদন", url: "/dashboard/leave/apply", icon: FileText },
      { title: "অনুমোদন", url: "/dashboard/leave/approval", icon: CheckSquare },
    ],
  },
  {
    label: "POP ম্যানেজমেন্ট",
    icon: Store,
    items: [
      { title: "ট্যারিফ কনফিগ", url: "/dashboard/branches/tariff", icon: Settings },
      { title: "POP যোগ করুন", url: "/dashboard/branches/add-manager", icon: UserPlus },
      { title: "POP ম্যানেজার লিস্ট", url: "/dashboard/branches/managers", icon: Users },
      { title: "POP ফান্ডিং", url: "/dashboard/branches/funding", icon: Banknote },
      { title: "ক্লায়েন্ট PGW পেমেন্ট", url: "/dashboard/branches/pgw-payments", icon: CreditCardIcon },
      { title: "PGW সেটেলমেন্ট", url: "/dashboard/branches/pgw-settlement", icon: Receipt },
      { title: "POP নোটিশ", url: "/dashboard/branches/pop-notice", icon: Bell },
    ],
  },
  {
    label: "ইভেন্ট ও ছুটি",
    icon: Calendar,
    items: [
      { title: "ইভেন্ট ও ছুটি", url: "/dashboard/events", icon: Calendar },
    ],
  },
  {
    label: "সাপোর্ট ও টিকেটিং",
    icon: Headphones,
    items: [
      { title: "সাপোর্ট ক্যাটাগরি", url: "/dashboard/support/categories", icon: FolderOpen },
      { title: "ক্লায়েন্ট সাপোর্ট", url: "/dashboard/support/tickets", icon: Headphones },
      { title: "সাপোর্ট হিস্টরি", url: "/dashboard/support/history", icon: History },
    ],
  },
  {
    label: "টাস্ক ম্যানেজমেন্ট",
    icon: CheckSquare,
    items: [
      { title: "টাস্ক ক্যাটাগরি", url: "/dashboard/tasks/categories", icon: FolderOpen },
      { title: "টাস্ক", url: "/dashboard/tasks", icon: CheckSquare },
      { title: "টাস্ক হিস্টরি", url: "/dashboard/tasks/history", icon: History },
    ],
  },
  {
    label: "ব্যান্ডউইথ ক্রয়",
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
    label: "ব্যান্ডউইথ বিক্রয়",
    icon: BarChart,
    items: [
      { title: "POP / কাস্টমার", url: "/dashboard/bw-sale/pop", icon: Radio },
      { title: "সার্ভিস ক্যাটালগ", url: "/dashboard/bw-sale/services", icon: Layers },
      { title: "বিক্রয় ইনভয়েস", url: "/dashboard/bw-sale/invoices", icon: FileText },
      { title: "বিল কালেকশন", url: "/dashboard/bw-sale/collection", icon: Wallet },
      { title: "রিকারিং ইনভয়েস", url: "/dashboard/bw-sale/recurring", icon: RefreshCw },
    ],
  },
  {
    label: "ক্রয়",
    icon: ShoppingCart,
    items: [
      { title: "ভেন্ডর", url: "/dashboard/purchases/vendors", icon: Store },
      { title: "রিকুইজিশন", url: "/dashboard/purchases/requisitions", icon: ClipboardList },
      { title: "ক্রয়", url: "/dashboard/purchases", icon: ShoppingCart },
      { title: "ক্রয় বিল", url: "/dashboard/purchases/bills", icon: Receipt },
    ],
  },
  {
    label: "বিক্রয় ও সার্ভিস",
    icon: Receipt,
    items: [
      { title: "প্রোডাক্ট ইনভয়েস", url: "/dashboard/sales/product-invoice", icon: FileText },
      { title: "সার্ভিস ইনভয়েস", url: "/dashboard/sales/service-invoice", icon: FileText },
    ],
  },
  {
    label: "ইনভেন্টরি",
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
    label: "অ্যাসেট",
    icon: Archive,
    items: [
      { title: "অ্যাসেট তালিকা", url: "/dashboard/assets", icon: Archive },
      { title: "নষ্ট আইটেম", url: "/dashboard/assets/destroyed", icon: Trash2 },
    ],
  },
  {
    label: "অ্যাকাউন্টিং",
    icon: BarChart3,
    items: [
      { title: "ড্যাশবোর্ড", url: "/dashboard/accounting", icon: PieChart },
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
    ],
  },
  {
    label: "রিপোর্ট",
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
    label: "SMS সার্ভিস",
    icon: Send,
    items: [
      { title: "ব্যক্তিগত SMS", url: "/dashboard/sms/individual", icon: MessageSquare },
      { title: "SMS টেমপ্লেট", url: "/dashboard/sms/templates", icon: FileText },
      { title: "SMS গ্রুপ", url: "/dashboard/sms/groups", icon: Users2 },
      { title: "SMS পাঠান", url: "/dashboard/sms/send", icon: Send },
      { title: "SMS গেটওয়ে", url: "/dashboard/sms/gateway", icon: Cog },
    ],
  },
  {
    label: "ই-কমার্স",
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
    label: "সিস্টেম",
    icon: Cog,
    items: [
      { title: "অ্যাপ ইউজার", url: "/dashboard/system/users", icon: Users },
      { title: "রোল", url: "/dashboard/system/roles", icon: Shield },
      { title: "OLT পারমিশন", url: "/dashboard/system/olt-permissions", icon: Cpu },
      { title: "কোম্পানি সেটআপ", url: "/dashboard/system/company", icon: Building },
      { title: "ইনভয়েস সেটআপ", url: "/dashboard/system/invoice", icon: FileText },
      { title: "পিরিয়ড সেটআপ", url: "/dashboard/system/periods", icon: Calendar },
      { title: "পেমেন্ট গেটওয়ে", url: "/dashboard/system/payment-gateways", icon: CreditCardIcon },
      { title: "ইমেইল সেটআপ", url: "/dashboard/system/email", icon: Mail },
      { title: "সিস্টেম সেটআপ", url: "/dashboard/system/setup", icon: Settings },
      { title: "প্রসেসিং ফি", url: "/dashboard/system/processing-fee", icon: DollarSign },
      { title: "সিস্টেম লগ", url: "/dashboard/system/system-log", icon: ScrollText },
    ],
  },
];

function CollapsibleGroup({ group, forceOpen }: { group: MenuGroup; forceOpen?: boolean }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { resolvedMode } = useTheme();
  const isLight = resolvedMode === "light";
  const isActiveGroup = group.items.some(item =>
    item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url)
  );
  const [open, setOpen] = useState(group.defaultOpen || isActiveGroup);
  const effectiveOpen = forceOpen ?? open;

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        {group.items.slice(0, 1).map((item) => {
          const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
          return (
            <NavLink key={item.url} to={item.url}
              className={cn("flex items-center justify-center w-10 h-10 rounded-lg mb-0.5 transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : isLight ? "text-muted-foreground hover:text-primary hover:bg-primary/5" : "text-slate-400 hover:text-white hover:bg-white/5"
              )} title={group.label}>
              <group.icon className="h-4 w-4" />
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-0.5">
      <button onClick={() => setOpen(!open)}
        className={cn("w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold transition-colors rounded-lg mx-2 uppercase tracking-wider",
          isActiveGroup
            ? "text-primary"
            : isLight ? "text-muted-foreground hover:text-foreground" : "text-slate-400 hover:text-white"
        )} style={{ width: "calc(100% - 16px)" }}>
        <group.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">{group.label}</span>
        {effectiveOpen ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
      </button>
      {effectiveOpen && (
        <div className="mx-2 mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
            return (
              <NavLink key={item.url} to={item.url}
                className={cn("flex items-center gap-2.5 px-4 py-[7px] text-[13px] rounded-lg transition-colors ml-3",
                  isActive
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                    : isLight
                      ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                )}>
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.title}</span>
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
  const isLight = resolvedMode === "light";
  const [search, setSearch] = useState("");
  const [reorderOpen, setReorderOpen] = useState(false);
  const [savedOrder, setSavedOrder] = useState<string[]>(() => loadSavedOrder());

  const orderedGroups = useMemo(() => {
    const allLabels = menuGroups.map((g) => g.label);
    const validSaved = savedOrder.filter((l) => allLabels.includes(l));
    const missing = allLabels.filter((l) => !validSaved.includes(l));
    const finalOrder = [...validSaved, ...missing];
    return finalOrder
      .map((l) => menuGroups.find((g) => g.label === l)!)
      .filter(Boolean);
  }, [savedOrder]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orderedGroups.map((g) => ({ group: g, matched: false }));
    return orderedGroups
      .map((g) => {
        const groupMatches = g.label.toLowerCase().includes(q);
        const items = groupMatches ? g.items : g.items.filter((i) => i.title.toLowerCase().includes(q));
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
          "flex items-center gap-2.5 px-4 py-4 shrink-0",
          collapsed && "justify-center px-2",
          isLight ? "border-b border-sidebar-border" : "border-b border-white/10"
        )}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold leading-tight">ISP Desk</h1>
              <p className={cn("text-[10px] leading-tight", isLight ? "text-muted-foreground" : "text-slate-400")}>ERP System</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className={cn("px-3 py-2 shrink-0", isLight ? "border-b border-sidebar-border" : "border-b border-white/10")}>
            <div className="relative">
              <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5", isLight ? "text-muted-foreground" : "text-slate-400")} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="মেনু খুঁজুন..."
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
              <CollapsibleGroup key={group.label} group={group} forceOpen={matched ? true : undefined} />
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                কোনো মেনু পাওয়া যায়নি
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
              মেনু সাজান
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
