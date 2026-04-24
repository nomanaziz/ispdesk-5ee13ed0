// Thin wrappers that reuse existing POP-Admin / Admin components inside the
// independent BwPanelLayout shell. Data scoping is handled by the underlying
// pages via usePopScope() (which reads customer.panel_branch_id for BW
// customers — already wired in the portal-data edge function).
export { default as BwPanelMikrotik } from "@/pages/reseller/config/PopDevices";
export { default as BwPanelClients } from "@/pages/dashboard/clients/ClientList";
export { default as BwPanelClientAdd } from "@/pages/dashboard/clients/AddClient";
export { default as BwPanelBulkImport } from "@/pages/reseller/clients/BulkClientImportHub";
export { default as BwPanelBilling } from "@/pages/dashboard/billing/BillingList";
export { default as BwPanelDailyCollection } from "@/pages/dashboard/billing/DailyCollection";
export { default as BwPanelTickets } from "@/pages/reseller/ResellerTickets";
export { default as BwPanelOnlineMonitoring } from "@/pages/reseller/PopOnlineMonitoring";
export { default as BwPanelSmsTemplates } from "@/pages/reseller/PopSmsTemplates";
export { default as BwPanelSmsSend } from "@/pages/reseller/sms/PopSmsSend";
export { default as BwPanelSmsGateway } from "@/pages/reseller/sms/PopSmsGateway";
export { default as BwPanelEmployees } from "@/pages/reseller/employee/PopEmployees";
export { default as BwPanelAddEmployee } from "@/pages/reseller/employee/PopAddEmployee";
export { default as BwPanelIncome } from "@/pages/reseller/accounting/PopIncome";
export { default as BwPanelExpense } from "@/pages/reseller/accounting/PopExpense";
export { default as BwPanelCashBook } from "@/pages/reseller/accounting/PopCashBook";
export { default as BwPanelBillCollection } from "@/pages/reseller/reports/PopBillCollection";
export { default as BwPanelReportCustomer } from "@/pages/reseller/reports/PopCustomer";
export { default as BwPanelReportFinancial } from "@/pages/reseller/reports/PopFinancial";
export { default as BwPanelSettings } from "@/pages/reseller/ResellerSettings";
