// POP (Branch Manager) menu permission tree
// Used by Add/Edit POP form and (later) ResellerLayout for menu rendering
// Default: all permissions enabled EXCEPT payment gateway items.

export type PopMenuItem = { key: string; label: string };
export type PopMenuGroup = { key: string; label: string; items: PopMenuItem[] };

export const POP_MENU_GROUPS: PopMenuGroup[] = [
  {
    key: "configuration",
    label: "Configuration",
    items: [
      { key: "config.zone", label: "Zone" },
      { key: "config.subzone", label: "Sub Zone" },
      { key: "config.box", label: "Box" },
      { key: "config.package", label: "Package" },
      { key: "config.district", label: "District" },
      { key: "config.upazila", label: "Upazila" },
      { key: "config.connection_type", label: "Connection Type" },
      { key: "config.protocol", label: "Protocol" },
      { key: "config.device", label: "Device" },
    ],
  },
  {
    key: "mikrotik",
    label: "Mikrotik",
    items: [
      { key: "mikrotik.servers", label: "Servers" },
      { key: "mikrotik.import", label: "Import Clients" },
      { key: "mikrotik.bulk_import", label: "Bulk Import" },
    ],
  },
  {
    key: "employee",
    label: "Employee (HR)",
    items: [
      { key: "hr.add_employee", label: "Add Employee" },
      { key: "hr.employees", label: "Employee List" },
      { key: "hr.salary", label: "Salary Sheet" },
      { key: "hr.payroll", label: "Payroll" },
      { key: "hr.attendance", label: "Attendance" },
    ],
  },
  {
    key: "client",
    label: "Client",
    items: [
      { key: "client.add", label: "Add Client" },
      { key: "client.list", label: "Client List" },
      { key: "client.left", label: "Left Clients" },
      { key: "client.scheduler", label: "Scheduler" },
      { key: "client.change_request", label: "Change Request" },
      { key: "client.portal_manage", label: "Portal Manage" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    items: [
      { key: "billing.list", label: "Billing List" },
      { key: "billing.invoice", label: "Invoice" },
      { key: "billing.daily_collection", label: "Daily Collection" },
      { key: "billing.client_profile", label: "Client Bill Profile" },
    ],
  },
  {
    key: "payment_gateway",
    label: "Payment Gateway (Admin Only)",
    items: [
      { key: "pgw.gateways", label: "Payment Gateways" },
      { key: "pgw.settlement", label: "PGW Settlement" },
      { key: "pgw.payments", label: "PGW Payments" },
    ],
  },
  {
    key: "monitoring",
    label: "Monitoring",
    items: [
      { key: "monitor.online_clients", label: "Online Client Monitoring" },
      { key: "monitor.ping", label: "Ping Tools" },
      { key: "monitor.pop_devices", label: "POP Devices" },
    ],
  },
  {
    key: "support",
    label: "Client Support",
    items: [
      { key: "support.categories", label: "Categories" },
      { key: "support.tickets", label: "Tickets / Complaints" },
      { key: "support.history", label: "History" },
    ],
  },
  {
    key: "sms",
    label: "SMS Service",
    items: [
      { key: "sms.template", label: "Templates" },
      { key: "sms.individual", label: "Individual" },
      { key: "sms.group", label: "Group" },
      { key: "sms.gateway", label: "Gateway" },
      { key: "sms.send", label: "Send SMS" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    items: [
      { key: "report.btrc", label: "BTRC" },
      { key: "report.bill_collection", label: "Bill Collection" },
      { key: "report.messages", label: "Messages" },
      { key: "report.processing_fee", label: "Processing Fee" },
      { key: "report.discount", label: "Discount" },
      { key: "report.due_sms", label: "Due SMS" },
      { key: "report.financial", label: "Financial" },
      { key: "report.customer", label: "Customer" },
    ],
  },
  {
    key: "fund",
    label: "Fund History",
    items: [
      { key: "fund.debit", label: "Debit History" },
      { key: "fund.credit", label: "Credit History" },
    ],
  },
];

// Items disabled by default (admin-only — payment gateway)
const DEFAULT_DISABLED_GROUPS = new Set(["payment_gateway"]);

export function buildDefaultPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  for (const group of POP_MENU_GROUPS) {
    const enabled = !DEFAULT_DISABLED_GROUPS.has(group.key);
    for (const item of group.items) {
      perms[item.key] = enabled;
    }
  }
  return perms;
}

export function allPermissionKeys(): string[] {
  return POP_MENU_GROUPS.flatMap((g) => g.items.map((i) => i.key));
}
