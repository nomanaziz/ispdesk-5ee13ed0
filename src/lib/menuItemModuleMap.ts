/**
 * প্রতিটি sidebar item URL → (module_group, module_name) mapping.
 * Sidebar এ item দেখাবে শুধু তখন, যখন user-এর ওই (group,name)-এ অন্তত read permission আছে।
 * Super Admin / Admin সব দেখে। Map-এ না থাকলে fallback: parent group-এর permission।
 */
export const ITEM_MODULE: Record<string, { group: string; name: string }> = {
  // Dashboard
  "/dashboard": { group: "DASHBOARD", name: "Dashboard" },

  // Clients
  "/dashboard/clients/new-request":     { group: "CLIENTS", name: "New Request" },
  "/dashboard/clients/home":            { group: "CLIENTS", name: "Home Clients" },
  "/dashboard/clients/corporate":       { group: "CLIENTS", name: "Corporate Clients" },
  "/dashboard/clients/left":            { group: "CLIENTS", name: "Left Clients" },
  "/dashboard/clients/scheduler":       { group: "CLIENTS", name: "Scheduler" },
  "/dashboard/clients/change-request":  { group: "CLIENTS", name: "Change Request" },
  "/dashboard/clients/portal-manage":   { group: "CLIENTS", name: "Portal Manage" },
  "/dashboard/clients/update-requests": { group: "CLIENTS", name: "Update Requests" },
  "/dashboard/clients/add":             { group: "CLIENTS", name: "Add Client" },

  // Billing (in All Clients group)
  "/dashboard/billing":                  { group: "BILLING", name: "Billing List" },
  "/dashboard/billing/daily-collection": { group: "BILLING", name: "Daily Collection" },
  "/dashboard/billing/cycle-settings":   { group: "BILLING", name: "Cycle Settings" },
  "/dashboard/sales/installation-fee":   { group: "BILLING", name: "Installation Fee" },

  // HR
  "/dashboard/hr/employee-hub":      { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/payroll":           { group: "HR_PAYROLL", name: "Payroll" },
  "/dashboard/hr/payslip":           { group: "HR_PAYROLL", name: "Payslip" },
  "/dashboard/hr/employees":         { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/salary-sheet":      { group: "HR_PAYROLL", name: "Salary Sheet" },
  "/dashboard/hr/advance-salary":    { group: "HR_PAYROLL", name: "Payroll" },
  "/dashboard/hr/loans":             { group: "HR_PAYROLL", name: "Payroll" },
  "/dashboard/hr/resignations":      { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/attendance":        { group: "HR_PAYROLL", name: "Attendance" },
  "/dashboard/hr/leave":             { group: "LEAVE", name: "Apply" },
  "/dashboard/hr/conveyance-bills":  { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/my-conveyance":     { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/catering":          { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/settings":          { group: "HR_PAYROLL", name: "Employees" },

  // System
  "/dashboard/system/setup":             { group: "SYSTEM", name: "Setup" },
  "/dashboard/access/app-users":         { group: "SYSTEM", name: "Users" },
  "/dashboard/access/roles":             { group: "SYSTEM", name: "Users" },
  "/dashboard/system/bill-period-years": { group: "SYSTEM", name: "Bill Period Years" },
  "/dashboard/system/periods":           { group: "SYSTEM", name: "Periods" },
  "/dashboard/system/company":           { group: "SYSTEM", name: "Company" },
  "/dashboard/system/invoice":           { group: "SYSTEM", name: "Invoice" },
  "/dashboard/system/email":             { group: "SYSTEM", name: "Email" },
  "/dashboard/system/payment-gateways":  { group: "SYSTEM", name: "Payment Gateways" },
  "/dashboard/system/processing-fee":    { group: "SYSTEM", name: "Processing Fee" },
  "/dashboard/system/automatic-process": { group: "SYSTEM", name: "Automatic Process" },
  "/dashboard/system/system-log":        { group: "SYSTEM", name: "System Log" },
  "/dashboard/system/custom-domain":     { group: "SYSTEM", name: "Custom Domain" },
  "/dashboard/my-subscription":          { group: "SYSTEM", name: "My Subscription" },

  // VAS
  "/dashboard/vas/config":        { group: "VAS", name: "Config" },
  "/dashboard/vas/subscriptions": { group: "VAS", name: "Subscriptions" },
  "/dashboard/vas/transactions":  { group: "VAS", name: "Transactions" },

  // Support
  "/dashboard/support/tickets":  { group: "SUPPORT", name: "Tickets" },
  "/dashboard/support/history":  { group: "SUPPORT", name: "History" },
  "/dashboard/support/notices":  { group: "SUPPORT", name: "Categories" },

  // Tasks
  "/dashboard/tasks":         { group: "TASKS", name: "Tasks" },
  "/dashboard/tasks/history": { group: "TASKS", name: "History" },

  // Reports
  "/dashboard/reports/bill-collection": { group: "REPORTS", name: "Bill Collection" },
  "/dashboard/reports/discount":        { group: "REPORTS", name: "Discount" },
  "/dashboard/reports/customer":        { group: "REPORTS", name: "Customer" },
  "/dashboard/reports/messages":        { group: "REPORTS", name: "Messages" },
  "/dashboard/reports/due-sms":         { group: "REPORTS", name: "Due SMS" },
  "/dashboard/reports/processing-fee":  { group: "REPORTS", name: "Processing Fee" },
  "/dashboard/reports/btrc":            { group: "REPORTS", name: "BTRC" },
  "/dashboard/reports/financial":       { group: "REPORTS", name: "Financial" },

  // SMS
  "/dashboard/sms/individual": { group: "SMS", name: "Individual" },
  "/dashboard/sms/templates":  { group: "SMS", name: "Templates" },
  "/dashboard/sms/groups":     { group: "SMS", name: "Groups" },
  "/dashboard/sms/send":       { group: "SMS", name: "Send" },
  "/dashboard/sms/gateway":    { group: "SMS", name: "Gateway" },
  "/dashboard/sms/telegram":   { group: "SMS", name: "Send" },

  // Accounting
  "/dashboard/accounting":               { group: "ACCOUNTING", name: "Chart of Accounts" },
  "/dashboard/accounting/chart":         { group: "ACCOUNTING", name: "Chart of Accounts" },
  "/dashboard/accounting/income":        { group: "ACCOUNTING", name: "Income" },
  "/dashboard/accounting/expense":       { group: "ACCOUNTING", name: "Expense" },
  "/dashboard/accounting/journal":       { group: "ACCOUNTING", name: "Journal" },
  "/dashboard/accounting/transactions":  { group: "ACCOUNTING", name: "Journal" },
  "/dashboard/accounting/balances":      { group: "ACCOUNTING", name: "Trial Balance" },
  "/dashboard/accounting/balance-sheet": { group: "ACCOUNTING", name: "Balance Sheet" },
  "/dashboard/accounting/profit-loss":   { group: "ACCOUNTING", name: "Profit & Loss" },
  "/dashboard/accounting/compare-pl":    { group: "ACCOUNTING", name: "Profit & Loss" },
  "/dashboard/accounting/trial-balance": { group: "ACCOUNTING", name: "Trial Balance" },
  "/dashboard/accounting/cash-book":     { group: "ACCOUNTING", name: "Cash Book" },
};
