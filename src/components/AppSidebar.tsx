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
    label: "Dashboard",
    icon: LayoutDashboard,
    iconColor: "text-blue-400",
    defaultOpen: true,
    items: [
      { title: "Billing Overview", url: "/dashboard", icon: CreditCard },
      { title: "OLT / ONU Overview", url: "/dashboard/olt-overview", icon: Cpu },
      { title: "ওয়েবসাইট ড্যাশবোর্ড", url: "/dashboard/website", icon: Globe },
    ],
  },
  {
    label: "Website Panel",
    icon: Globe,
    iconColor: "text-purple-400",
    items: [
      { title: "Homepage Editor", url: "/dashboard/website/homepage", icon: Monitor },
      { title: "Pages", url: "/dashboard/website/pages", icon: FileText },
      { title: "Notices", url: "/dashboard/website/notices", icon: Bell },
      { title: "Offers", url: "/dashboard/website/offers", icon: Tag },
      { title: "Testimonials", url: "/dashboard/website/testimonials", icon: MessageSquare },
      { title: "Partners", url: "/dashboard/website/partners", icon: Link2 },
      { title: "Features", url: "/dashboard/website/features", icon: Layers },
      { title: "Services", url: "/dashboard/website/services", icon: Wrench },
      { title: "Festivals", url: "/dashboard/website/festivals", icon: Megaphone },
      { title: "Menu Editor", url: "/dashboard/website/menu", icon: List },
      
      { title: "Media Library", url: "/dashboard/website/media", icon: FolderOpen },
      { title: "About Page", url: "/dashboard/website/about", icon: BookOpen },
      { title: "Site Settings", url: "/dashboard/website/settings", icon: Cog },
    ],
  },
  {
    label: "Configuration",
    icon: Settings,
    iconColor: "text-slate-400",
    items: [
      { title: "Zone", url: "/dashboard/config/zones", icon: MapPin },
      { title: "Sub Zone", url: "/dashboard/config/sub-zones", icon: Layers },
      { title: "Box", url: "/dashboard/config/boxes", icon: Boxes },
      { title: "Connection Type", url: "/dashboard/config/connection-types", icon: Cable },
      { title: "Client Type", url: "/dashboard/config/client-types", icon: Users },
      { title: "Protocol Type", url: "/dashboard/config/protocol-types", icon: Shield },
      { title: "Billing Status", url: "/dashboard/config/billing-statuses", icon: Tag },
      { title: "Package", url: "/dashboard/config/packages", icon: Package },
      { title: "Division", url: "/dashboard/config/divisions", icon: Building },
      { title: "District", url: "/dashboard/config/districts", icon: Globe },
      { title: "Upazila", url: "/dashboard/config/upazilas", icon: MapPin },
      { title: "Service Type", url: "/dashboard/config/service-types", icon: Wrench },
    ],
  },
  {
    label: "VAS",
    icon: Wrench,
    iconColor: "text-teal-400",
    items: [
      { title: "VAS Config", url: "/dashboard/vas/config", icon: Cog },
      { title: "Transaction History", url: "/dashboard/vas/transactions", icon: History },
    ],
  },
  {
    label: "Client",
    icon: Users,
    iconColor: "text-emerald-400",
    items: [
      { title: "New Request", url: "/dashboard/clients/new-request", icon: MessageSquare },
      { title: "Add New", url: "/dashboard/clients/add", icon: UserPlus },
      { title: "Client List", url: "/dashboard/clients", icon: List },
      { title: "Left Client", url: "/dashboard/clients/left", icon: UserX },
      { title: "Scheduler", url: "/dashboard/clients/scheduler", icon: Clock },
      { title: "Change Request", url: "/dashboard/clients/change-request", icon: RefreshCw },
      { title: "Portal Manage", url: "/dashboard/clients/portal-manage", icon: Monitor },
    ],
  },
  {
    label: "Billing",
    icon: CreditCard,
    iconColor: "text-amber-400",
    items: [
      { title: "Billing List", url: "/dashboard/billing", icon: CreditCard },
      { title: "Daily Bill Collection", url: "/dashboard/billing/daily-collection", icon: Wallet },
    ],
  },
  {
    label: "Mikrotik Server",
    icon: Server,
    iconColor: "text-cyan-400",
    items: [
      { title: "Server", url: "/dashboard/mikrotik/servers", icon: Server },
      { title: "Server Backup", url: "/dashboard/mikrotik/backup", icon: HardDrive },
      { title: "Import From Mikrotik", url: "/dashboard/mikrotik/import", icon: Upload },
      { title: "Bulk Clients Import", url: "/dashboard/mikrotik/bulk-import", icon: Users },
    ],
  },
  {
    label: "HR & Payroll",
    icon: UserCog,
    iconColor: "text-violet-400",
    items: [
      { title: "Department", url: "/dashboard/hr/departments", icon: Building2 },
      { title: "Payhead", url: "/dashboard/hr/payheads", icon: DollarSign },
      { title: "Payroll", url: "/dashboard/hr/payroll", icon: Wallet },
      { title: "Position", url: "/dashboard/hr/positions", icon: Briefcase },
      { title: "Payslip", url: "/dashboard/hr/payslip", icon: FileText },
      { title: "Add Employee", url: "/dashboard/hr/employees/add", icon: UserPlus },
      { title: "Employee List", url: "/dashboard/hr/employees", icon: Users },
      { title: "Salary Sheet", url: "/dashboard/hr/salary-sheet", icon: ScrollText },
      { title: "Resign Rule", url: "/dashboard/hr/resign-rules", icon: FileText },
      { title: "Resignation", url: "/dashboard/hr/resignations", icon: UserX },
      { title: "Rejoin", url: "/dashboard/hr/rejoin", icon: UserPlus },
      { title: "Attendance", url: "/dashboard/hr/attendance", icon: CheckSquare },
      { title: "Shift Management", url: "/dashboard/hr/shifts", icon: Clock },
      { title: "ZKTeco Devices", url: "/dashboard/hr/zkteco-devices", icon: Server },
      { title: "Attendance Rules", url: "/dashboard/hr/attendance-rules", icon: Shield },
    ],
  },
  {
    label: "OLT Management",
    icon: Cpu,
    iconColor: "text-red-400",
    items: [
      { title: "OLT Devices", url: "/dashboard/olt", icon: Server },
      { title: "ONU List", url: "/dashboard/olt/onu", icon: List },
      { title: "OLT Users", url: "/dashboard/olt/users", icon: Users },
      { title: "User Down Count", url: "/dashboard/olt/user-down", icon: UserX },
      { title: "Fiber Down Finder", url: "/dashboard/olt/fiber-down", icon: Cable },
      { title: "OLT Sharing", url: "/dashboard/olt/sharing", icon: Link2 },
    ],
  },
  {
    label: "Network Monitoring",
    icon: Activity,
    iconColor: "text-orange-400",
    items: [
      { title: "Switch List", url: "/dashboard/monitoring/switches", icon: Network },
      { title: "Add Switch", url: "/dashboard/monitoring/add-switch", icon: UserPlus },
      { title: "POP DASS", url: "/dashboard/monitoring/pop-dass", icon: Monitor },
      { title: "POP IP", url: "/dashboard/monitoring/pop-ip", icon: Globe },
      { title: "POP Log", url: "/dashboard/monitoring/pop-log", icon: ScrollText },
      { title: "Ping Tools", url: "/dashboard/monitoring/ping-tools", icon: Wifi },
      { title: "POP Devices", url: "/dashboard/monitoring/pop-devices", icon: Radio },
    ],
  },
  {
    label: "Network Diagram",
    icon: Network,
    iconColor: "text-sky-400",
    items: [
      { title: "Diagram", url: "/dashboard/network/diagram", icon: Network },
      { title: "Network POP", url: "/dashboard/network/pop", icon: Radio },
      { title: "Clients in Diagram", url: "/dashboard/network/clients", icon: Users },
      { title: "Network Connections", url: "/dashboard/network/connections", icon: Cable },
      { title: "Distributed Inv. Items", url: "/dashboard/network/distributed-items", icon: Boxes },
      { title: "Network View in Map", url: "/dashboard/network/map", icon: Map },
    ],
  },
  {
    label: "Leave Management",
    icon: CalendarDays,
    iconColor: "text-lime-400",
    items: [
      { title: "Category", url: "/dashboard/leave/categories", icon: FolderOpen },
      { title: "Setup", url: "/dashboard/leave/setup", icon: Settings },
      { title: "Apply", url: "/dashboard/leave/apply", icon: FileText },
      { title: "Approval", url: "/dashboard/leave/approval", icon: CheckSquare },
    ],
  },
  {
    label: "Branch Office",
    icon: Building,
    iconColor: "text-indigo-400",
    items: [
      { title: "Package", url: "/dashboard/branches/packages", icon: Package },
      { title: "Tariff Config", url: "/dashboard/branches/tariff", icon: Settings },
      { title: "Add Branch Manager", url: "/dashboard/branches/add-manager", icon: UserPlus },
      { title: "Branch Managers List", url: "/dashboard/branches/managers", icon: Users },
      { title: "Branch Funding", url: "/dashboard/branches/funding", icon: Banknote },
      { title: "Client PGW Payments", url: "/dashboard/branches/pgw-payments", icon: CreditCardIcon },
      { title: "PGW Transaction Settlement", url: "/dashboard/branches/pgw-settlement", icon: Receipt },
      { title: "POP Notice", url: "/dashboard/branches/pop-notice", icon: Bell },
    ],
  },
  {
    label: "Events & Holidays",
    icon: Calendar,
    iconColor: "text-rose-400",
    items: [
      { title: "Events & Holidays", url: "/dashboard/events", icon: Calendar },
    ],
  },
  {
    label: "Support & Ticketing",
    icon: Headphones,
    iconColor: "text-fuchsia-400",
    items: [
      { title: "Support Category", url: "/dashboard/support/categories", icon: FolderOpen },
      { title: "Client Support", url: "/dashboard/support/tickets", icon: Headphones },
      { title: "Support History", url: "/dashboard/support/history", icon: History },
    ],
  },
  {
    label: "Task Management",
    icon: CheckSquare,
    iconColor: "text-yellow-400",
    items: [
      { title: "Task Category", url: "/dashboard/tasks/categories", icon: FolderOpen },
      { title: "Task", url: "/dashboard/tasks", icon: CheckSquare },
      { title: "Task History", url: "/dashboard/tasks/history", icon: History },
    ],
  },
  {
    label: "Bandwidth Buy",
    icon: Wifi,
    iconColor: "text-blue-300",
    items: [
      { title: "Item", url: "/dashboard/bw-buy/items", icon: Package },
      { title: "Item Category", url: "/dashboard/bw-buy/categories", icon: FolderOpen },
      { title: "Provider", url: "/dashboard/bw-buy/providers", icon: Building2 },
      { title: "Purchase Bill", url: "/dashboard/bw-buy/bills", icon: Receipt },
    ],
  },
  {
    label: "Bandwidth Sale",
    icon: BarChart,
    iconColor: "text-emerald-300",
    items: [
      { title: "POP", url: "/dashboard/bw-sale/pop", icon: Radio },
      { title: "Sales Invoice", url: "/dashboard/bw-sale/invoices", icon: FileText },
      { title: "Bill Collection", url: "/dashboard/bw-sale/collection", icon: Wallet },
      { title: "Recurring Invoice", url: "/dashboard/bw-sale/recurring", icon: RefreshCw },
    ],
  },
  {
    label: "Purchase",
    icon: ShoppingCart,
    iconColor: "text-orange-400",
    items: [
      { title: "Vendor", url: "/dashboard/purchases/vendors", icon: Store },
      { title: "Requisition", url: "/dashboard/purchases/requisitions", icon: ClipboardList },
      { title: "Purchase", url: "/dashboard/purchases", icon: ShoppingCart },
      { title: "Purchase Bill", url: "/dashboard/purchases/bills", icon: Receipt },
    ],
  },
  {
    label: "Sales & Service",
    icon: Receipt,
    iconColor: "text-pink-400",
    items: [
      { title: "Product Invoice", url: "/dashboard/sales/product-invoice", icon: FileText },
      { title: "Service Invoice", url: "/dashboard/sales/service-invoice", icon: FileText },
      { title: "Installation Fee", url: "/dashboard/sales/installation-fee", icon: DollarSign },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    iconColor: "text-amber-300",
    items: [
      { title: "Unit", url: "/dashboard/inventory/units", icon: CircleDot },
      { title: "Store Location", url: "/dashboard/inventory/locations", icon: Store },
      { title: "Item Category", url: "/dashboard/inventory/categories", icon: FolderOpen },
      { title: "Item", url: "/dashboard/inventory/items", icon: Package },
      { title: "Stock", url: "/dashboard/inventory/stock", icon: Archive },
    ],
  },
  {
    label: "Assets",
    icon: Archive,
    iconColor: "text-stone-400",
    items: [
      { title: "Asset List", url: "/dashboard/assets", icon: Archive },
      { title: "Destroyed Items", url: "/dashboard/assets/destroyed", icon: Trash2 },
    ],
  },
  {
    label: "Accounting",
    icon: BarChart3,
    iconColor: "text-green-400",
    items: [
      { title: "Dashboard", url: "/dashboard/accounting", icon: PieChart },
      { title: "Chart of Accounts", url: "/dashboard/accounting/chart", icon: BookOpen },
      { title: "Income", url: "/dashboard/accounting/income", icon: DollarSign },
      { title: "Expense", url: "/dashboard/accounting/expense", icon: Banknote },
      { title: "Journal", url: "/dashboard/accounting/journal", icon: BookMarked },
      { title: "Transactions", url: "/dashboard/accounting/transactions", icon: Receipt },
      { title: "Account Balances", url: "/dashboard/accounting/balances", icon: Scale },
      { title: "Balance Sheet", url: "/dashboard/accounting/balance-sheet", icon: FileBarChart },
      { title: "Profit Loss", url: "/dashboard/accounting/profit-loss", icon: BarChart3 },
      { title: "Compare P&L", url: "/dashboard/accounting/compare-pl", icon: BarChart },
      { title: "Trial Balance", url: "/dashboard/accounting/trial-balance", icon: Scale },
      { title: "Cash Book", url: "/dashboard/accounting/cash-book", icon: BookOpen },
    ],
  },
  {
    label: "Report",
    icon: FileBarChart,
    iconColor: "text-cyan-300",
    items: [
      { title: "Bill Collection", url: "/dashboard/reports/bill-collection", icon: Wallet },
      { title: "Discount Report", url: "/dashboard/reports/discount", icon: Tag },
      { title: "Customer Report", url: "/dashboard/reports/customer", icon: Users },
      { title: "Messages Report", url: "/dashboard/reports/messages", icon: MessageSquare },
      { title: "Due Customer SMS", url: "/dashboard/reports/due-sms", icon: Send },
      { title: "Pay. Processing Fee", url: "/dashboard/reports/processing-fee", icon: DollarSign },
      { title: "BTRC Monthly Report", url: "/dashboard/reports/btrc", icon: Landmark },
      { title: "Financial Transactions", url: "/dashboard/reports/financial", icon: BarChart3 },
    ],
  },
  {
    label: "SMS Service",
    icon: Send,
    iconColor: "text-green-300",
    items: [
      { title: "Individual SMS", url: "/dashboard/sms/individual", icon: MessageSquare },
      { title: "SMS Template", url: "/dashboard/sms/templates", icon: FileText },
      { title: "SMS Group", url: "/dashboard/sms/groups", icon: Users2 },
      { title: "Send SMS", url: "/dashboard/sms/send", icon: Send },
      { title: "SMS Gateway", url: "/dashboard/sms/gateway", icon: Cog },
    ],
  },
  {
    label: "Affiliation",
    icon: Link2,
    iconColor: "text-purple-400",
    items: [
      { title: "Affiliate Partners", url: "/dashboard/affiliation/partners", icon: Users },
      { title: "Add Affiliator", url: "/dashboard/affiliation/add", icon: UserPlus },
    ],
  },
  {
    label: "System",
    icon: Cog,
    iconColor: "text-gray-400",
    items: [
      { title: "App Users", url: "/dashboard/system/users", icon: Users },
      { title: "Roles", url: "/dashboard/system/roles", icon: Shield },
      { title: "OLT Permissions", url: "/dashboard/system/olt-permissions", icon: Cpu },
      { title: "Company SetUp", url: "/dashboard/system/company", icon: Building },
      { title: "Invoice SetUp", url: "/dashboard/system/invoice", icon: FileText },
      { title: "Periods SetUp", url: "/dashboard/system/periods", icon: Calendar },
      { title: "Payment Gateways", url: "/dashboard/system/payment-gateways", icon: CreditCardIcon },
      { title: "EMail SetUp", url: "/dashboard/system/email", icon: Mail },
      { title: "System SetUp", url: "/dashboard/system/setup", icon: Settings },
      { title: "P. Processing Fee", url: "/dashboard/system/processing-fee", icon: DollarSign },
      { title: "System Log", url: "/dashboard/system/system-log", icon: ScrollText },
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
