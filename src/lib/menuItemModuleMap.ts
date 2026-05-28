/**
 * প্রতিটি sidebar item URL → (module_group, module_name) mapping।
 * Sidebar এ item দেখাবে শুধু তখন, যখন user-এর ওই (group,name)-এ অন্তত read permission আছে।
 * Super Admin / Admin সব দেখে। Map-এ না থাকলে non-admin user item দেখবে না (strict)।
 */
export const ITEM_MODULE: Record<string, { group: string; name: string }> = {
  // Dashboard
  "/dashboard": { group: "DASHBOARD", name: "Dashboard" },
  "/dashboard/links": { group: "DASHBOARD", name: "Dashboard" },

  // Clients (All Clients group)
  "/dashboard/clients/new-request":     { group: "CLIENTS", name: "New Request" },
  "/dashboard/clients/home":            { group: "CLIENTS", name: "Home Clients" },
  "/dashboard/clients/corporate":       { group: "CLIENTS", name: "Corporate Clients" },
  "/dashboard/clients/left":            { group: "CLIENTS", name: "Left Clients" },
  "/dashboard/clients/scheduler":       { group: "CLIENTS", name: "Scheduler" },
  "/dashboard/clients/change-request":  { group: "CLIENTS", name: "Change Request" },
  "/dashboard/clients/portal-manage":   { group: "CLIENTS", name: "Portal Manage" },
  "/dashboard/clients/update-requests": { group: "CLIENTS", name: "Update Requests" },
  "/dashboard/clients/add":             { group: "CLIENTS", name: "Add Client" },

  // Billing & related (All Clients menu group — unified under CLIENTS)
  "/dashboard/billing":                  { group: "CLIENTS", name: "Billing List" },
  "/dashboard/billing/client":           { group: "CLIENTS", name: "Billing List" },
  "/dashboard/billing/daily-collection": { group: "CLIENTS", name: "Daily Collection" },
  "/dashboard/sales/installation-fee":   { group: "CLIENTS", name: "Installation Fee" },
  // Billing Cycle Settings sidebar item লাইভ আছে System group-এ
  "/dashboard/billing/cycle-settings":   { group: "SYSTEM",  name: "Billing Cycle Settings" },

  // POP / MAC ক্লায়েন্ট (Branches)
  "/dashboard/branches/managers":         { group: "BRANCHES", name: "Managers" },
  "/dashboard/branches/tariff":           { group: "BRANCHES", name: "Tariff" },
  "/dashboard/branches/funding":          { group: "BRANCHES", name: "Funding" },
  "/dashboard/branches/pgw-transactions": { group: "BRANCHES", name: "PGW Payments" },

  // ব্যান্ডউইথ ক্লায়েন্ট (BW Sale)
  "/dashboard/bw-sale/pop":           { group: "BW_SALE", name: "Customers" },
  "/dashboard/bw-sale/services":      { group: "BW_SALE", name: "Customers" },
  "/dashboard/bw-sale/invoices":      { group: "BW_SALE", name: "Invoices" },
  "/dashboard/bw-sale/collection":    { group: "BW_SALE", name: "Collections" },
  "/dashboard/bw-sale/recurring":     { group: "BW_SALE", name: "Recurring" },
  "/dashboard/bw-sale/panel-pricing": { group: "BW_SALE", name: "Customers" },

  // Support
  "/dashboard/support/tickets":  { group: "SUPPORT", name: "Tickets" },
  "/dashboard/support/history":  { group: "SUPPORT", name: "History" },
  "/dashboard/support/notices":  { group: "SUPPORT", name: "Categories" },

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

  // HR ও পেরোল — প্রতিটি item আলাদা module
  "/dashboard/hr/employee-hub":      { group: "HR_PAYROLL", name: "Employee Hub" },
  "/dashboard/hr/payroll":           { group: "HR_PAYROLL", name: "Payroll" },
  "/dashboard/hr/payslip":           { group: "HR_PAYROLL", name: "Payslip" },
  "/dashboard/hr/employees":         { group: "HR_PAYROLL", name: "Employees" },
  "/dashboard/hr/salary-sheet":      { group: "HR_PAYROLL", name: "Salary Sheet" },
  "/dashboard/hr/advance-salary":    { group: "HR_PAYROLL", name: "Advance Salary" },
  "/dashboard/hr/loans":             { group: "HR_PAYROLL", name: "Employee Loans" },
  "/dashboard/hr/resignations":      { group: "HR_PAYROLL", name: "Resignations" },
  "/dashboard/hr/attendance":        { group: "HR_PAYROLL", name: "Attendance" },
  "/dashboard/hr/leave":             { group: "HR_PAYROLL", name: "Leave Management" },
  "/dashboard/hr/conveyance-bills":  { group: "HR_PAYROLL", name: "Conveyance Bills" },
  "/dashboard/hr/my-conveyance":     { group: "HR_PAYROLL", name: "Conveyance Bills" },
  "/dashboard/hr/catering":          { group: "HR_PAYROLL", name: "Catering" },
  "/dashboard/hr/settings":          { group: "HR_PAYROLL", name: "HR Settings" },

  // OLT ম্যানেজমেন্ট
  "/dashboard/olt-overview":              { group: "OLT", name: "Devices" },
  "/dashboard/olt":                       { group: "OLT", name: "Devices" },
  "/dashboard/olt/power-dashboard":       { group: "OLT", name: "Devices" },
  "/dashboard/olt/online-monitoring":     { group: "OLT", name: "Devices" },
  "/dashboard/olt/onu":                   { group: "OLT", name: "ONU List" },
  "/dashboard/olt/users":                 { group: "OLT", name: "Users" },
  "/dashboard/olt/ports":                 { group: "OLT", name: "Devices" },
  "/dashboard/olt/user-down":             { group: "OLT", name: "Devices" },
  "/dashboard/olt/fiber-down":            { group: "OLT", name: "Devices" },
  "/dashboard/olt/sharing":               { group: "OLT", name: "Sharing" },

  // নেটওয়ার্ক মনিটরিং
  "/dashboard/monitoring/online":       { group: "MONITORING", name: "Online Clients" },
  "/dashboard/monitoring/live-traffic": { group: "MONITORING", name: "Live Traffic" },
  "/dashboard/network/switches":        { group: "MONITORING", name: "POP Devices" },
  "/dashboard/monitoring/pop-dass":     { group: "MONITORING", name: "POP Devices" },
  "/dashboard/monitoring/pop-ip":       { group: "MONITORING", name: "POP Devices" },
  "/dashboard/monitoring/pop-log":      { group: "MONITORING", name: "POP Devices" },
  "/dashboard/monitoring/ping-tools":   { group: "MONITORING", name: "POP Devices" },
  "/dashboard/monitoring/pop-devices":  { group: "MONITORING", name: "POP Devices" },

  // নেটওয়ার্ক ডায়াগ্রাম
  "/dashboard/network/diagram":           { group: "NETWORK", name: "Diagram" },
  "/dashboard/network/pop":               { group: "NETWORK", name: "POP" },
  "/dashboard/network/clients":           { group: "NETWORK", name: "Diagram" },
  "/dashboard/network/connections":       { group: "NETWORK", name: "Connections" },
  "/dashboard/network/distributed-items": { group: "NETWORK", name: "Connections" },
  "/dashboard/network/map":               { group: "NETWORK", name: "Map" },

  // ডিভাইস (Device Admin)
  "/dashboard/device-admin":                  { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/devices":          { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/oid-library":      { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/polling-agents":   { group: "NETWORK", name: "Devices" },
  "/dashboard/mikrotik/servers":              { group: "MIKROTIK", name: "Servers" },
  "/dashboard/device-admin/users":            { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/jobs":             { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/groups":           { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/backups":          { group: "MIKROTIK", name: "Backup" },
  "/dashboard/device-admin/schedules":        { group: "NETWORK", name: "Devices" },
  "/dashboard/device-admin/audit-log":        { group: "NETWORK", name: "Devices" },

  // Tasks
  "/dashboard/tasks":         { group: "TASKS", name: "Tasks" },
  "/dashboard/tasks/history": { group: "TASKS", name: "History" },

  // ব্যান্ডউইথ ক্রয় (BW Buy)
  "/dashboard/bw-buy/items":         { group: "BW_BUY", name: "Subscriptions" },
  "/dashboard/bw-buy/categories":    { group: "BW_BUY", name: "Subscriptions" },
  "/dashboard/bw-buy/providers":     { group: "BW_BUY", name: "Providers" },
  "/dashboard/bw-buy/subscriptions": { group: "BW_BUY", name: "Subscriptions" },
  "/dashboard/bw-buy/bills":         { group: "BW_BUY", name: "Bills" },

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

  // ই-কমার্স (Shop)
  "/dashboard/shop/categories": { group: "SHOP", name: "Categories" },
  "/dashboard/shop/products":   { group: "SHOP", name: "Products" },
  "/dashboard/shop/orders":     { group: "SHOP", name: "Orders" },
  "/dashboard/shop/shipping":   { group: "SHOP", name: "Shipping Zones" },
  "/dashboard/shop/coupons":    { group: "SHOP", name: "Coupons" },
  "/dashboard/shop/warranty":   { group: "SHOP", name: "Warranty Claims" },
  "/dashboard/shop/reports":    { group: "SHOP", name: "Sales Report" },

  // ক্রয় (Purchases)
  "/dashboard/purchases/requisitions": { group: "PURCHASES", name: "Requisitions" },
  "/dashboard/purchases":              { group: "PURCHASES", name: "Purchases" },
  "/dashboard/purchases/bills":        { group: "PURCHASES", name: "Bills" },

  // বিক্রয় ও সার্ভিস (Sales)
  "/dashboard/sales/product-invoice": { group: "SALES", name: "Product Invoice" },
  "/dashboard/sales/service-invoice": { group: "SALES", name: "Service Invoice" },

  // ইনভেন্টরি
  "/dashboard/inventory/units":      { group: "INVENTORY", name: "Items" },
  "/dashboard/inventory/locations":  { group: "INVENTORY", name: "Locations" },
  "/dashboard/inventory/categories": { group: "INVENTORY", name: "Categories" },
  "/dashboard/inventory/items":      { group: "INVENTORY", name: "Items" },
  "/dashboard/inventory/stock":      { group: "INVENTORY", name: "Stock" },

  // অ্যাসেট
  "/dashboard/assets":           { group: "ASSETS", name: "Asset List" },
  "/dashboard/assets/destroyed": { group: "ASSETS", name: "Destroyed" },

  // ইভেন্ট ও ছুটি — Leave module
  "/dashboard/events": { group: "LEAVE", name: "Setup" },

  // ওয়েবসাইট প্যানেল
  "/dashboard/website":               { group: "WEBSITE", name: "Pages" },
  "/dashboard/website/homepage":      { group: "WEBSITE", name: "Homepage" },
  "/dashboard/website/pages":         { group: "WEBSITE", name: "Pages" },
  "/dashboard/website/notices":       { group: "WEBSITE", name: "Notices" },
  "/dashboard/website/offers":        { group: "WEBSITE", name: "Offers" },
  "/dashboard/website/testimonials":  { group: "WEBSITE", name: "Testimonials" },
  "/dashboard/website/partners":      { group: "WEBSITE", name: "Partners" },
  "/dashboard/website/features":      { group: "WEBSITE", name: "Features" },
  "/dashboard/website/services":      { group: "WEBSITE", name: "Services" },
  "/dashboard/website/festivals":     { group: "WEBSITE", name: "Festivals" },
  "/dashboard/website/menu":          { group: "WEBSITE", name: "Menu" },
  "/dashboard/website/media":         { group: "WEBSITE", name: "Media" },
  "/dashboard/website/about":         { group: "WEBSITE", name: "About" },
  "/dashboard/website/settings":      { group: "WEBSITE", name: "Settings" },

  // কনফিগারেশন
  "/dashboard/config/zones":             { group: "CONFIG", name: "Zones" },
  "/dashboard/config/sub-zones":         { group: "CONFIG", name: "Sub Zones" },
  "/dashboard/config/boxes":             { group: "CONFIG", name: "Boxes" },
  "/dashboard/config/connection-types":  { group: "CONFIG", name: "Connection Types" },
  "/dashboard/config/client-types":      { group: "CONFIG", name: "Client Types" },
  "/dashboard/config/protocol-types":    { group: "CONFIG", name: "Protocol Types" },
  "/dashboard/config/billing-statuses":  { group: "CONFIG", name: "Billing Statuses" },
  "/dashboard/config/packages":          { group: "CONFIG", name: "Packages" },
  "/dashboard/config/locations":         { group: "CONFIG", name: "Divisions" },
  "/dashboard/config/service-types":     { group: "CONFIG", name: "Service Types" },

  // সিস্টেম
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
};
