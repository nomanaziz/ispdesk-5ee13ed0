import {
  LayoutDashboard, Receipt, LifeBuoy, Users, Settings, Activity, Server,
  Cog, MapPin, Box, Package, Layers, Briefcase, BadgeCheck, Cpu,
  UserPlus, Wallet, BarChart3, FileText, Calendar,
  MessageSquare, Send, Antenna, Wifi, History, TrendingUp, BookOpen, FileSpreadsheet,
} from "lucide-react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { PortalSidebar } from "./PortalSidebar";
import type { PortalMenuGroup } from "./sidebarUtils";
import type { Tint } from "@/components/sidebar/MenuIconTile";

type PermKey =
  | "dashboard" | "configuration" | "employee" | "client"
  | "billing" | "monitoring" | "sms" | "reports"
  | "tickets" | "support" | "system" | "fund_history" | "settings"
  | "users" | "invoices" | "accounting";

interface ResellerGroup extends PortalMenuGroup {
  key: PermKey | string;
}

const groups: ResellerGroup[] = [
  {
    key: "dashboard", label: "ড্যাশবোর্ড", labelEn: "Dashboard", icon: LayoutDashboard, tint: "indigo",
    items: [
      { url: "/pop-admin/dashboard", title: "ড্যাশবোর্ড", titleEn: "Dashboard", icon: LayoutDashboard },
      { url: "/pop-admin/notes", title: "নোট", titleEn: "Notes", icon: FileText },
    ],
  },
  {
    key: "configuration", label: "কনফিগারেশন", labelEn: "Configuration", icon: Cog, tint: "slate",
    items: [
      { url: "/pop-admin/config/zones", title: "জোন", titleEn: "Zone", icon: MapPin },
      { url: "/pop-admin/config/sub-zones", title: "সাব জোন", titleEn: "Sub Zone", icon: Layers },
      { url: "/pop-admin/config/boxes", title: "বক্স", titleEn: "Box", icon: Box },
      { url: "/pop-admin/config/packages", title: "প্যাকেজ", titleEn: "Package", icon: Package },
      { url: "/pop-admin/config/districts", title: "জেলা", titleEn: "District", icon: MapPin },
      { url: "/pop-admin/config/upazilas", title: "উপজেলা", titleEn: "Upazila", icon: MapPin },
      { url: "/pop-admin/config/departments", title: "বিভাগ", titleEn: "Department", icon: Briefcase },
      { url: "/pop-admin/config/designations", title: "পদবী", titleEn: "Designation", icon: BadgeCheck },
      { url: "/pop-admin/config/devices", title: "ডিভাইস", titleEn: "Device", icon: Cpu },
    ],
  },
  {
    key: "employee", label: "কর্মচারী", labelEn: "Employee", icon: Users, tint: "pink",
    items: [
      { url: "/pop-admin/employees/add", title: "কর্মচারী যোগ", titleEn: "Add Employee", icon: UserPlus },
      { url: "/pop-admin/employees", title: "কর্মচারী তালিকা", titleEn: "Employee List", icon: Users },
      { url: "/pop-admin/employees/salary-sheet", title: "বেতন শীট", titleEn: "Salary Sheet", icon: FileText },
    ],
  },
  {
    key: "client", label: "ক্লায়েন্ট", labelEn: "Client", icon: Users, tint: "violet",
    items: [
      { url: "/pop-admin/clients/add", title: "ক্লায়েন্ট যোগ", titleEn: "Add Client", icon: UserPlus },
      { url: "/pop-admin/clients", title: "ক্লায়েন্ট তালিকা", titleEn: "Client List", icon: Users },
      { url: "/pop-admin/mikrotik-users", title: "মাইক্রোটিক ইউজার", titleEn: "MikroTik Users", icon: Server },
      { url: "/pop-admin/clients/bulk-import", title: "বাল্ক ক্লায়েন্ট ইম্পোর্ট", titleEn: "Bulk Client Import", icon: FileSpreadsheet },
      { url: "/pop-admin/billing/list", title: "বিলিং তালিকা", titleEn: "Billing List", icon: Receipt },
      { url: "/pop-admin/billing/daily-collection", title: "দৈনিক সংগ্রহ", titleEn: "Daily Collection", icon: Wallet },
      { url: "/pop-admin/clients/left", title: "চলে যাওয়া ক্লায়েন্ট", titleEn: "Left Clients", icon: Users },
      { url: "/pop-admin/clients/scheduler", title: "শিডিউলার", titleEn: "Scheduler", icon: Calendar },
    ],
  },
  {
    key: "monitoring", label: "মনিটরিং", labelEn: "Monitoring", icon: Antenna, tint: "green",
    items: [
      { url: "/pop-admin/monitoring/online", title: "অনলাইন ক্লায়েন্ট", titleEn: "Online Clients", icon: Wifi },
    ],
  },
  {
    key: "support", label: "সাপোর্ট টিকেট", labelEn: "Support Tickets", icon: LifeBuoy, tint: "rose",
    items: [
      { url: "/pop-admin/tickets", title: "ক্লায়েন্ট টিকেট", titleEn: "Client Tickets", icon: LifeBuoy },
    ],
  },
  {
    key: "sms", label: "এসএমএস সার্ভিস", labelEn: "SMS Service", icon: MessageSquare, tint: "sky",
    items: [
      { url: "/pop-admin/sms/templates", title: "টেমপ্লেট", titleEn: "Templates", icon: FileText },
      { url: "/pop-admin/sms/individual", title: "ইন্ডিভিজুয়াল / গ্রুপ", titleEn: "Individual / Group", icon: Users },
      { url: "/pop-admin/sms/send", title: "এসএমএস পাঠান", titleEn: "Send SMS", icon: Send },
      { url: "/pop-admin/sms/gateway", title: "গেটওয়ে", titleEn: "Gateway", icon: Server },
      { url: "/pop-admin/sms/telegram", title: "Telegram বট", titleEn: "Telegram Bot", icon: Send },
    ],
  },
  {
    key: "reports", label: "রিপোর্ট", labelEn: "Reports", icon: BarChart3, tint: "blue",
    items: [
      { url: "/pop-admin/reports/bill-collection", title: "বিল সংগ্রহ", titleEn: "Bill Collection", icon: BarChart3 },
      { url: "/pop-admin/reports/customer", title: "কাস্টমার", titleEn: "Customer", icon: BarChart3 },
      { url: "/pop-admin/reports/enable-disable", title: "চালু/বন্ধ", titleEn: "Enable/Disable", icon: BarChart3 },
      { url: "/pop-admin/reports/messages", title: "মেসেজ", titleEn: "Messages", icon: BarChart3 },
      { url: "/pop-admin/reports/due-sms", title: "ডিউ এসএমএস", titleEn: "Due SMS", icon: BarChart3 },
      { url: "/pop-admin/reports/discount", title: "ডিসকাউন্ট", titleEn: "Discount", icon: BarChart3 },
      { url: "/pop-admin/reports/processing-fee", title: "প্রসেসিং ফি", titleEn: "Processing Fee", icon: BarChart3 },
      { url: "/pop-admin/reports/financial", title: "আর্থিক", titleEn: "Financial", icon: BarChart3 },
    ],
  },
  {
    key: "accounting", label: "হিসাব", labelEn: "Accounting", icon: Wallet, tint: "emerald",
    items: [
      { url: "/pop-admin/accounting/income", title: "আয়", titleEn: "Income", icon: TrendingUp },
      { url: "/pop-admin/accounting/expense", title: "ব্যয়", titleEn: "Expense", icon: Wallet },
      { url: "/pop-admin/accounting/cashbook", title: "ক্যাশ বই", titleEn: "Cash Book", icon: BookOpen },
    ],
  },
  {
    key: "fund_history", label: "ফান্ড হিস্ট্রি", labelEn: "Fund History", icon: History, tint: "amber",
    items: [
      { url: "/pop-admin/fund-history/credit", title: "ক্রেডিট হিস্ট্রি", titleEn: "Credit History", icon: History },
      { url: "/pop-admin/fund-history/debit", title: "ডেবিট হিস্ট্রি", titleEn: "Debit History", icon: History },
    ],
  },
  {
    key: "system", label: "সিস্টেম", labelEn: "System", icon: Settings, tint: "zinc",
    items: [
      { url: "/pop-admin/system/setup", title: "সিস্টেম সেটআপ", titleEn: "System Setup", icon: Cog },
      { url: "/pop-admin/system/bill-period", title: "বিল পিরিয়ড", titleEn: "Bill Period", icon: Calendar },
      { url: "/pop-admin/system/period", title: "পিরিয়ড সেটআপ", titleEn: "Period Setup", icon: Calendar },
      { url: "/pop-admin/settings", title: "কোম্পানি সেটআপ", titleEn: "Company Settings", icon: Settings },
      { url: "/pop-admin/system/invoice", title: "ইনভয়েস সেটআপ", titleEn: "Invoice Setup", icon: FileText },
      { url: "/pop-admin/system/email", title: "ইমেইল সেটআপ", titleEn: "Email Setup", icon: MessageSquare },
      { url: "/pop-admin/system/payment-gateways", title: "পেমেন্ট গেটওয়ে", titleEn: "Payment Gateways", icon: Wallet },
      { url: "/pop-admin/system/processing-fee", title: "প্রসেসিং ফি", titleEn: "Processing Fee", icon: Wallet },
      { url: "/pop-admin/system/automatic-process", title: "অটোমেটিক প্রসেস", titleEn: "Automatic Process", icon: Activity },
      { url: "/pop-admin/system/activity-log", title: "অ্যাক্টিভিটি লগ", titleEn: "Activity Log", icon: History },
    ],
  },
];

function isGroupAllowed(g: ResellerGroup, customer: any): boolean {
  if (!customer) return false;
  if (customer.type === "bw_customer") return false;
  const isSub = customer.type === "reseller_sub";
  if (!isSub) return true;
  const perms = customer.permissions || {};
  const legacyMap: Record<string, string[]> = {
    dashboard: ["dashboard"],
    configuration: ["configuration", "settings"],
    employee: ["employee", "users"],
    client: ["client", "mikrotik", "dashboard"],
    billing: ["billing", "invoices"],
    monitoring: ["monitoring", "tickets"],
    sms: ["sms"],
    reports: ["reports"],
    tickets: ["tickets"],
    support: ["tickets", "monitoring"],
    system: ["system", "settings"],
    accounting: ["accounting"],
    fund_history: ["fund_history", "settings"],
  };
  return (legacyMap[g.key] || [g.key]).some((k) => perms[k]);
}

export function ResellerSidebar() {
  const { customer } = usePortalAuth();
  const isSub = customer?.type === "reseller_sub";
  const subPerms: Record<string, boolean> = (customer?.permissions as any) || {};

  const visible = groups
    .filter((g) => isGroupAllowed(g, customer))
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !isSub || subPerms[i.url] !== false),
    }))
    .filter((g) => g.items.length > 0);

  const title = customer?.name?.toUpperCase() || "RESELLER";
  const subtitle = customer?.code ? `POP ${customer.code}` : customer?.username;

  return <PortalSidebar groups={visible} title={title} subtitle={subtitle} />;
}
