import { useState } from "react";
import {
  LayoutDashboard, Settings, Users, CreditCard,
  MessageSquare, ChevronDown, ChevronRight, Activity,
  HelpCircle, type LucideIcon, Network, Radio, Server,
  Wallet, UserCog, CalendarDays, Package, BarChart3,
  BookOpen, FileText, Send, Boxes, Truck, Building2,
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
    items: [{ title: "Overview", url: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Clients",
    icon: Users,
    iconColor: "text-emerald-400",
    items: [
      { title: "All Clients", url: "/dashboard/clients", icon: Users },
      { title: "Connection Requests", url: "/dashboard/requests", icon: MessageSquare },
      { title: "Change Requests", url: "/dashboard/change-requests", icon: HelpCircle },
    ],
  },
  {
    label: "Billing",
    icon: CreditCard,
    iconColor: "text-amber-400",
    items: [
      { title: "Monthly Billing", url: "/dashboard/billing", icon: CreditCard },
      { title: "Collections", url: "/dashboard/collections", icon: Wallet },
      { title: "Installation Fees", url: "/dashboard/installation-fees", icon: FileText },
    ],
  },
  {
    label: "Network",
    icon: Network,
    iconColor: "text-cyan-400",
    items: [
      { title: "OLT Devices", url: "/dashboard/olt", icon: Server },
      { title: "ONU List", url: "/dashboard/onu", icon: Radio },
      { title: "MikroTik", url: "/dashboard/mikrotik", icon: Network },
    ],
  },
  {
    label: "HR & Payroll",
    icon: UserCog,
    iconColor: "text-violet-400",
    items: [
      { title: "Employees", url: "/dashboard/employees", icon: Users },
      { title: "Payroll", url: "/dashboard/payroll", icon: Wallet },
      { title: "Leave Management", url: "/dashboard/leave", icon: CalendarDays },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    iconColor: "text-orange-400",
    items: [
      { title: "Items", url: "/dashboard/inventory", icon: Package },
      { title: "Purchases", url: "/dashboard/purchases", icon: Truck },
    ],
  },
  {
    label: "Accounting",
    icon: BarChart3,
    iconColor: "text-pink-400",
    items: [
      { title: "Chart of Accounts", url: "/dashboard/accounts", icon: BookOpen },
      { title: "Journal Entries", url: "/dashboard/journal", icon: FileText },
      { title: "Income & Expense", url: "/dashboard/income-expense", icon: BarChart3 },
    ],
  },
  {
    label: "SMS",
    icon: Send,
    iconColor: "text-green-400",
    items: [
      { title: "Send SMS", url: "/dashboard/sms", icon: Send },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    iconColor: "text-slate-400",
    items: [
      { title: "Branches", url: "/dashboard/branches", icon: Building2 },
      { title: "System Settings", url: "/dashboard/settings", icon: Settings },
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
