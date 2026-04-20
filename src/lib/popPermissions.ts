// POP (Branch Manager) menu permission tree
// Mirrors ResellerLayout sidebar 1:1 — single source of truth.
// Default: all permissions enabled.

export type PopMenuItem = { key: string; label: string };
export type PopMenuGroup = { key: string; label: string; items: PopMenuItem[] };

// Each item.key matches the route path used in ResellerLayout sidebar.
export const POP_MENU_GROUPS: PopMenuGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    items: [{ key: "/pop-admin/dashboard", label: "Dashboard" }],
  },
  {
    key: "configuration",
    label: "Configuration",
    items: [
      { key: "/pop-admin/config/zones", label: "Zone" },
      { key: "/pop-admin/config/sub-zones", label: "Sub Zone" },
      { key: "/pop-admin/config/boxes", label: "Box" },
      { key: "/pop-admin/config/packages", label: "Package" },
      { key: "/pop-admin/config/districts", label: "District" },
      { key: "/pop-admin/config/upazilas", label: "Upazila" },
      { key: "/pop-admin/config/departments", label: "Department" },
      { key: "/pop-admin/config/designations", label: "Designation" },
      { key: "/pop-admin/config/devices", label: "Device" },
    ],
  },
  {
    key: "mikrotik",
    label: "MikroTik Client",
    items: [{ key: "/pop-admin/mikrotik-users", label: "MikroTik Users" }],
  },
  {
    key: "employee",
    label: "Employee",
    items: [
      { key: "/pop-admin/employees/add", label: "Add Employee" },
      { key: "/pop-admin/employees", label: "Employee List" },
      { key: "/pop-admin/employees/salary-sheet", label: "Salary Sheet" },
      { key: "/pop-admin/employees/payroll", label: "Payroll" },
      { key: "/pop-admin/employees/attendance", label: "Attendance" },
    ],
  },
  {
    key: "client",
    label: "Client",
    items: [
      { key: "/pop-admin/clients/add", label: "Add Client" },
      { key: "/pop-admin/clients", label: "Client List" },
      { key: "/pop-admin/clients/billing", label: "Billing Client" },
      { key: "/pop-admin/clients/left", label: "Left Clients" },
      { key: "/pop-admin/clients/scheduler", label: "Scheduler" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    items: [
      { key: "/pop-admin/billing/list", label: "Billing List" },
      { key: "/pop-admin/billing/invoice", label: "Invoice" },
      { key: "/pop-admin/billing/daily-collection", label: "Daily Collection" },
      { key: "/pop-admin/billing/profile", label: "Client Bill Profile" },
    ],
  },
  {
    key: "monitoring",
    label: "Monitoring",
    items: [
      { key: "/pop-admin/monitoring/online", label: "Online Clients" },
      { key: "/pop-admin/tickets", label: "Client Support" },
      { key: "/pop-admin/monitoring/ping", label: "Ping Tools" },
    ],
  },
  {
    key: "sms",
    label: "SMS Service",
    items: [
      { key: "/pop-admin/sms/templates", label: "Templates" },
      { key: "/pop-admin/sms/individual", label: "Individual / Group" },
      { key: "/pop-admin/sms/send", label: "Send SMS" },
      { key: "/pop-admin/sms/gateway", label: "Gateway" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    items: [
      { key: "/pop-admin/reports/bill-collection", label: "Bill Collection" },
      { key: "/pop-admin/reports/enable-disable", label: "Enable/Disable" },
      { key: "/pop-admin/reports/messages", label: "Messages" },
      { key: "/pop-admin/reports/processing-fee", label: "Processing Fee" },
      { key: "/pop-admin/reports/discount", label: "Discount" },
      { key: "/pop-admin/reports/due-sms", label: "Due SMS" },
    ],
  },
  {
    key: "purchases",
    label: "Purchase Orders",
    items: [{ key: "/pop-admin/purchases", label: "Purchase Orders" }],
  },
  {
    key: "system",
    label: "System",
    items: [
      { key: "/pop-admin/settings", label: "Company Settings" },
      { key: "/pop-admin/system/period", label: "Period" },
      { key: "/pop-admin/users", label: "Users" },
    ],
  },
  {
    key: "fund_history",
    label: "Fund History",
    items: [
      { key: "/pop-admin/fund-history/credit", label: "Credit History" },
      { key: "/pop-admin/fund-history/debit", label: "Debit History" },
    ],
  },
];

export function buildDefaultPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  for (const group of POP_MENU_GROUPS) {
    // group-level key (used by ResellerLayout.isGroupAllowed)
    perms[group.key] = true;
    for (const item of group.items) {
      perms[item.key] = true;
    }
  }
  return perms;
}

export function allPermissionKeys(): string[] {
  return POP_MENU_GROUPS.flatMap((g) => [g.key, ...g.items.map((i) => i.key)]);
}
