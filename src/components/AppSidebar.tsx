import { useState } from "react";
import {
  LayoutDashboard, Settings, Users, CreditCard,
  ChevronDown, ChevronRight, Activity,
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
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuItem { title: string; url: string; icon: LucideIcon; }
interface MenuGroup { label: string; icon: LucideIcon; iconColor: string; items: MenuItem[]; defaultOpen?: boolean; }

const menuGroups: MenuGroup[] = [
  {
    label: "ড্যাশবোর্ড",
    icon: LayoutDashboard,
    iconColor: "text-blue-400",
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
    iconColor: "text-purple-400",
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
    iconColor: "text-slate-400",
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
    iconColor: "text-teal-400",
    items: [
      { title: "VAS কনফিগ", url: "/dashboard/vas/config", icon: Cog },
      { title: "সাবস্ক্রিপশন", url: "/dashboard/vas/subscriptions", icon: Users },
      { title: "লেনদেন", url: "/dashboard/vas/transactions", icon: History },
    ],
  },
  {
    label: "ক্লায়েন্ট",
    icon: Users,
    iconColor: "text-emerald-400",
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
    iconColor: "text-amber-400",
    items: [
      { title: "বিলিং তালিকা", url: "/dashboard/billing", icon: CreditCard },
      { title: "দৈনিক বিল কালেকশন", url: "/dashboard/billing/daily-collection", icon: Wallet },
      { title: "ইনস্টলেশন ফি", url: "/dashboard/sales/installation-fee", icon: DollarSign },
    ],
  },
  {
    label: "MikroTik সার্ভার",
    icon: Server,
    iconColor: "text-cyan-400",
    items: [
      { title: "সার্ভার", url: "/dashboard/mikrotik/servers", icon: Server },
      { title: "সার্ভার ব্যাকআপ", url: "/dashboard/mikrotik/backup", icon: HardDrive },
      { title: "MikroTik থেকে ইম্পোর্ট", url: "/dashboard/mikrotik/import", icon: Upload },
      { title: "বাল্ক ক্লায়েন্ট ইম্পোর্ট", url: "/dashboard/mikrotik/bulk-import", icon: Users },
    ],
  },
  {
    label: "HR ও পেরোল",
    icon: UserCog,
    iconColor: "text-violet-400",
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
    iconColor: "text-red-400",
    items: [
      { title: "OLT ডিভাইস", url: "/dashboard/olt", icon: Server },
      { title: "ONU তালিকা", url: "/dashboard/olt/onu", icon: List },
      { title: "OLT ইউজার", url: "/dashboard/olt/users", icon: Users },
      { title: "ইউজার ডাউন কাউন্ট", url: "/dashboard/olt/user-down", icon: UserX },
      { title: "ফাইবার ডাউন ফাইন্ডার", url: "/dashboard/olt/fiber-down", icon: Cable },
      { title: "OLT শেয়ারিং", url: "/dashboard/olt/sharing", icon: Link2 },
    ],
  },
  {
    label: "নেটওয়ার্ক মনিটরিং",
    icon: Activity,
    iconColor: "text-orange-400",
    items: [
      { title: "অনলাইন মনিটরিং", url: "/dashboard/monitoring/online", icon: Wifi },
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
    iconColor: "text-sky-400",
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
    iconColor: "text-lime-400",
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
    iconColor: "text-indigo-400",
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
    iconColor: "text-rose-400",
    items: [
      { title: "ইভেন্ট ও ছুটি", url: "/dashboard/events", icon: Calendar },
    ],
  },
  {
    label: "সাপোর্ট ও টিকেটিং",
    icon: Headphones,
    iconColor: "text-fuchsia-400",
    items: [
      { title: "সাপোর্ট ক্যাটাগরি", url: "/dashboard/support/categories", icon: FolderOpen },
      { title: "ক্লায়েন্ট সাপোর্ট", url: "/dashboard/support/tickets", icon: Headphones },
      { title: "সাপোর্ট হিস্টরি", url: "/dashboard/support/history", icon: History },
    ],
  },
  {
    label: "টাস্ক ম্যানেজমেন্ট",
    icon: CheckSquare,
    iconColor: "text-yellow-400",
    items: [
      { title: "টাস্ক ক্যাটাগরি", url: "/dashboard/tasks/categories", icon: FolderOpen },
      { title: "টাস্ক", url: "/dashboard/tasks", icon: CheckSquare },
      { title: "টাস্ক হিস্টরি", url: "/dashboard/tasks/history", icon: History },
    ],
  },
  {
    label: "ব্যান্ডউইথ ক্রয়",
    icon: Wifi,
    iconColor: "text-blue-300",
    items: [
      { title: "আইটেম", url: "/dashboard/bw-buy/items", icon: Package },
      { title: "আইটেম ক্যাটাগরি", url: "/dashboard/bw-buy/categories", icon: FolderOpen },
      { title: "প্রোভাইডার", url: "/dashboard/bw-buy/providers", icon: Building2 },
      { title: "ক্রয় বিল", url: "/dashboard/bw-buy/bills", icon: Receipt },
    ],
  },
  {
    label: "ব্যান্ডউইথ বিক্রয়",
    icon: BarChart,
    iconColor: "text-emerald-300",
    items: [
      { title: "POP", url: "/dashboard/bw-sale/pop", icon: Radio },
      { title: "বিক্রয় ইনভয়েস", url: "/dashboard/bw-sale/invoices", icon: FileText },
      { title: "বিল কালেকশন", url: "/dashboard/bw-sale/collection", icon: Wallet },
      { title: "রিকারিং ইনভয়েস", url: "/dashboard/bw-sale/recurring", icon: RefreshCw },
    ],
  },
  {
    label: "ক্রয়",
    icon: ShoppingCart,
    iconColor: "text-orange-400",
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
    iconColor: "text-pink-400",
    items: [
      { title: "প্রোডাক্ট ইনভয়েস", url: "/dashboard/sales/product-invoice", icon: FileText },
      { title: "সার্ভিস ইনভয়েস", url: "/dashboard/sales/service-invoice", icon: FileText },
    ],
  },
  {
    label: "ইনভেন্টরি",
    icon: Boxes,
    iconColor: "text-amber-300",
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
    iconColor: "text-stone-400",
    items: [
      { title: "অ্যাসেট তালিকা", url: "/dashboard/assets", icon: Archive },
      { title: "নষ্ট আইটেম", url: "/dashboard/assets/destroyed", icon: Trash2 },
    ],
  },
  {
    label: "অ্যাকাউন্টিং",
    icon: BarChart3,
    iconColor: "text-green-400",
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
    iconColor: "text-cyan-300",
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
    iconColor: "text-green-300",
    items: [
      { title: "ব্যক্তিগত SMS", url: "/dashboard/sms/individual", icon: MessageSquare },
      { title: "SMS টেমপ্লেট", url: "/dashboard/sms/templates", icon: FileText },
      { title: "SMS গ্রুপ", url: "/dashboard/sms/groups", icon: Users2 },
      { title: "SMS পাঠান", url: "/dashboard/sms/send", icon: Send },
      { title: "SMS গেটওয়ে", url: "/dashboard/sms/gateway", icon: Cog },
    ],
  },
  {
    label: "অ্যাফিলিয়েশন",
    icon: Link2,
    iconColor: "text-purple-400",
    items: [
      { title: "অ্যাফিলিয়েট পার্টনার", url: "/dashboard/affiliation/partners", icon: Users },
      { title: "অ্যাফিলিয়েটর যোগ", url: "/dashboard/affiliation/add", icon: UserPlus },
    ],
  },
  {
    label: "সিস্টেম",
    icon: Cog,
    iconColor: "text-gray-400",
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

function CollapsibleGroup({ group }: { group: MenuGroup }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActiveGroup = group.items.some(item =>
    item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url)
  );
  const [open, setOpen] = useState(group.defaultOpen || isActiveGroup);

  if (collapsed) {
    return (
      <div className="px-2 py-1">
        {group.items.slice(0, 1).map((item) => {
          const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
          return (
            <NavLink key={item.url} to={item.url}
              className={cn("flex items-center justify-center w-10 h-10 rounded-lg mb-0.5 transition-colors",
                isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )} title={group.label}>
              <group.icon className={cn("h-4 w-4", group.iconColor)} />
            </NavLink>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)}
        className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mx-2",
          isActiveGroup ? "text-white" : "text-slate-300 hover:text-white hover:bg-white/5"
        )} style={{ width: "calc(100% - 16px)" }}>
        <group.icon className={cn("h-4 w-4 shrink-0", group.iconColor)} />
        <span className="flex-1 text-left truncate">{group.label}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
      </button>
      {open && (
        <div className="ml-6 mr-2 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {group.items.map((item) => {
            const isActive = item.url === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(item.url);
            return (
              <NavLink key={item.url} to={item.url}
                className={cn("flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors",
                  isActive ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}>
                <item.icon className="h-3.5 w-3.5" />
                <span className="truncate">{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="flex flex-col h-full bg-[#1e2139] text-white">
        <div className={cn("flex items-center gap-2.5 px-4 py-4 border-b border-white/10 shrink-0", collapsed && "justify-center px-2")}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold leading-tight">ISP Desk</h1>
              <p className="text-[10px] text-slate-400 leading-tight">ERP System</p>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1">
          <SidebarContent className="bg-transparent py-3">
            {menuGroups.map((group) => (
              <CollapsibleGroup key={group.label} group={group} />
            ))}
          </SidebarContent>
        </ScrollArea>
      </div>
    </Sidebar>
  );
}
