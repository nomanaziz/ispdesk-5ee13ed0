// Thin wrappers that reuse existing POP-Admin / Admin components inside the
// independent BwCustomerLayout shell. Data scoping is handled by the underlying
// pages via usePopScope() (which reads customer.panel_branch_id for BW
// customers — already wired in the portal-data edge function).
export { default as BwPanelMikrotik } from "@/pages/bw-panel/BwPanelMikrotikServers";
export { default as BwPanelMikrotikUsers } from "@/pages/reseller/ResellerMikrotikUsers";
export { default as BwPanelClients } from "@/pages/dashboard/clients/ClientList";
export { default as BwPanelClientAdd } from "@/pages/dashboard/clients/AddClient";
export { default as BwPanelBulkImport } from "@/pages/reseller/clients/BulkClientImportHub";
export { default as BwPanelLeftClients } from "@/pages/dashboard/clients/LeftClients";
export { default as BwPanelScheduler } from "@/pages/dashboard/clients/Scheduler";
export { default as BwPanelBilling } from "@/pages/dashboard/billing/BillingList";
export { default as BwPanelDailyCollection } from "@/pages/dashboard/billing/DailyCollection";
export { default as BwPanelTickets } from "@/pages/reseller/ResellerTickets";
export { default as BwPanelOnlineMonitoring } from "@/pages/reseller/PopOnlineMonitoring";
export { default as BwPanelSmsTemplates } from "@/pages/reseller/PopSmsTemplates";
export { default as BwPanelSmsSend } from "@/pages/reseller/sms/PopSmsSend";
export { default as BwPanelSmsGateway } from "@/pages/reseller/sms/PopSmsGateway";
export { default as BwPanelEmployees } from "@/pages/reseller/employee/PopEmployees";
export { default as BwPanelAddEmployee } from "@/pages/reseller/employee/PopAddEmployee";
export { default as BwPanelSalarySheet } from "@/pages/reseller/employee/PopSalarySheet";
export { default as BwPanelIncome } from "@/pages/reseller/accounting/PopIncome";
export { default as BwPanelExpense } from "@/pages/reseller/accounting/PopExpense";
export { default as BwPanelCashBook } from "@/pages/reseller/accounting/PopCashBook";
export { default as BwPanelBillCollection } from "@/pages/reseller/reports/PopBillCollection";
export { default as BwPanelReportCustomer } from "@/pages/reseller/reports/PopCustomer";
export { default as BwPanelReportFinancial } from "@/pages/reseller/reports/PopFinancial";
export { default as BwPanelSettings } from "@/pages/reseller/ResellerSettings";

// Configuration (admin pages — already POP-scoped via usePopScope)
export { default as BwPanelConfigZones } from "@/pages/dashboard/config/Zones";
export { default as BwPanelConfigSubZones } from "@/pages/dashboard/config/SubZones";
export { default as BwPanelConfigBoxes } from "@/pages/dashboard/config/Boxes";
export { default as BwPanelConfigPackages } from "@/pages/dashboard/config/Packages";
export { default as BwPanelConfigDepartments } from "@/pages/dashboard/hr/Departments";
export { default as BwPanelConfigDesignations } from "@/pages/reseller/config/PopDesignations";
export { default as BwPanelConfigDevices } from "@/pages/reseller/config/PopDevices";
