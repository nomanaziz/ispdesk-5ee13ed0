// Thin wrappers that reuse existing POP-Admin / Admin components inside the
// independent BwCustomerLayout shell. Data scoping is handled by the underlying
// pages via usePopScope() (which reads customer.panel_branch_id for BW
// customers — already wired in the portal-data edge function).

// ---- existing ----
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

// ---- new (mirror admin sidebar, reduced) ----

// Clients (extended)
export { default as BwPanelClientNewRequest } from "@/pages/dashboard/clients/NewRequest";
export { default as BwPanelHomeClients } from "@/pages/dashboard/clients/HomeClients";
export { default as BwPanelCorporateClients } from "@/pages/dashboard/clients/CorporateClients";
export { default as BwPanelChangeRequest } from "@/pages/dashboard/clients/ChangeRequest";
export { default as BwPanelInstallationFee } from "@/pages/dashboard/sales/InstallationFee";

// Support
export { default as BwPanelSupportTickets } from "@/pages/dashboard/support/Tickets";
export { default as BwPanelSupportHistory } from "@/pages/dashboard/support/History";
export { default as BwPanelSupportNotices } from "@/pages/dashboard/support/Notices";

// Configuration (extended)
export { default as BwPanelConfigConnectionTypes } from "@/pages/dashboard/config/ConnectionTypes";
export { default as BwPanelConfigClientTypes } from "@/pages/dashboard/config/ClientTypes";
export { default as BwPanelConfigProtocolTypes } from "@/pages/dashboard/config/ProtocolTypes";
export { default as BwPanelConfigBillingStatuses } from "@/pages/dashboard/config/BillingStatuses";
export { default as BwPanelConfigLocations } from "@/pages/dashboard/config/Locations";
export { default as BwPanelConfigServiceTypes } from "@/pages/dashboard/config/ServiceTypes";

// OLT (full)
export { default as BwPanelOltOverview } from "@/pages/dashboard/OltOverview";
export { default as BwPanelOltDevices } from "@/pages/dashboard/olt/OltDevices";
export { default as BwPanelOltPower } from "@/pages/dashboard/olt/PowerDashboard";
export { default as BwPanelOnuList } from "@/pages/dashboard/olt/OnuList";
export { default as BwPanelOltUsers } from "@/pages/dashboard/olt/OltUsers";
export { default as BwPanelOltPorts } from "@/pages/dashboard/olt/OltPorts";
export { default as BwPanelUserDownCount } from "@/pages/dashboard/olt/UserDownCount";
export { default as BwPanelFiberDownFinder } from "@/pages/dashboard/olt/FiberDownFinder";
export { default as BwPanelOltSharing } from "@/pages/dashboard/olt/OltSharing";

// Network monitoring (full)
export { default as BwPanelMonOnline } from "@/pages/dashboard/monitoring/OnlineClientMonitoring";
export { default as BwPanelMonLiveTraffic } from "@/pages/dashboard/monitoring/LiveTraffic";
export { default as BwPanelMonSwitches } from "@/pages/dashboard/network/SwitchList";
export { default as BwPanelMonPopDass } from "@/pages/dashboard/monitoring/PopDass";
export { default as BwPanelMonPopIp } from "@/pages/dashboard/monitoring/PopIp";
export { default as BwPanelMonPopLog } from "@/pages/dashboard/monitoring/PopLog";
export { default as BwPanelMonPingTools } from "@/pages/dashboard/monitoring/PingTools";
export { default as BwPanelMonPopDevices } from "@/pages/dashboard/monitoring/PopDevices";

// Device admin (basic)
export { default as BwPanelDeviceDashboard } from "@/pages/dashboard/device-admin/Dashboard";
export { default as BwPanelDeviceInventory } from "@/pages/dashboard/device-admin/Devices";
export { default as BwPanelMikrotikPppoe } from "@/pages/dashboard/mikrotik/Servers";
