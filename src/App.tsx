import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PublicLayout } from "@/components/PublicLayout";
import { lazy, Suspense } from "react";

// Public pages
import Home from "@/pages/public/Home";
import Packages from "@/pages/public/Packages";
import Coverage from "@/pages/public/Coverage";
import NewConnection from "@/pages/public/NewConnection";
import QuickPay from "@/pages/public/QuickPay";
import Services from "@/pages/public/Services";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Offers from "@/pages/public/Offers";

// Auth pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import OltOverview from "./pages/dashboard/OltOverview";
import NotFound from "./pages/NotFound";

// Config
import ConfigZones from "@/pages/dashboard/config/Zones";
import ConfigSubZones from "@/pages/dashboard/config/SubZones";
import ConfigBoxes from "@/pages/dashboard/config/Boxes";
import ConfigConnectionTypes from "@/pages/dashboard/config/ConnectionTypes";
import ConfigClientTypes from "@/pages/dashboard/config/ClientTypes";
import ConfigProtocolTypes from "@/pages/dashboard/config/ProtocolTypes";
import ConfigBillingStatuses from "@/pages/dashboard/config/BillingStatuses";
import ConfigPackages from "@/pages/dashboard/config/Packages";
import ConfigDivisions from "@/pages/dashboard/config/Divisions";
import ConfigDistricts from "@/pages/dashboard/config/Districts";
import ConfigUpazilas from "@/pages/dashboard/config/Upazilas";

// VAS
import VasConfig from "@/pages/dashboard/vas/VasConfig";
import VasTransactions from "@/pages/dashboard/vas/VasTransactions";
import VasSubscriptions from "@/pages/dashboard/vas/VasSubscriptions";

// Client
import ClientNewRequest from "@/pages/dashboard/clients/NewRequest";
import ClientAdd from "@/pages/dashboard/clients/AddClient";
import ClientList from "@/pages/dashboard/clients/ClientList";
import ClientLeft from "@/pages/dashboard/clients/LeftClients";
import ClientScheduler from "@/pages/dashboard/clients/Scheduler";
import ClientChangeRequest from "@/pages/dashboard/clients/ChangeRequest";
import ClientPortalManage from "@/pages/dashboard/clients/PortalManage";

// Billing
import BillingList from "@/pages/dashboard/billing/BillingList";
import BillingDailyCollection from "@/pages/dashboard/billing/DailyCollection";
import ClientProfile from "@/pages/dashboard/billing/ClientProfile";

// Mikrotik
import MikrotikServers from "@/pages/dashboard/mikrotik/Servers";
import MikrotikBackup from "@/pages/dashboard/mikrotik/Backup";
import MikrotikImport from "@/pages/dashboard/mikrotik/Import";
import MikrotikBulkImport from "@/pages/dashboard/mikrotik/BulkImport";

// HR
import HrDepartments from "@/pages/dashboard/hr/Departments";
import HrPayheads from "@/pages/dashboard/hr/Payheads";
import HrPayroll from "@/pages/dashboard/hr/Payroll";
import HrPositions from "@/pages/dashboard/hr/Positions";
import HrPayslip from "@/pages/dashboard/hr/Payslip";
import HrAddEmployee from "@/pages/dashboard/hr/AddEmployee";
import HrEmployees from "@/pages/dashboard/hr/Employees";
import HrSalarySheet from "@/pages/dashboard/hr/SalarySheet";
import HrResignRules from "@/pages/dashboard/hr/ResignRules";
import HrResignations from "@/pages/dashboard/hr/Resignations";
import HrRejoin from "@/pages/dashboard/hr/Rejoin";
import HrAttendance from "@/pages/dashboard/hr/Attendance";
import HrShiftManagement from "@/pages/dashboard/hr/ShiftManagement";
import HrZktecoDevices from "@/pages/dashboard/hr/ZktecoDevices";
import HrAttendanceRules from "@/pages/dashboard/hr/AttendanceRules";
import HrSettings from "@/pages/dashboard/hr/HrSettings";

// OLT
import OltDevices from "@/pages/dashboard/olt/OltDevices";
import OltUsers from "@/pages/dashboard/olt/OltUsers";
import OnuList from "@/pages/dashboard/olt/OnuList";
import UserDownCount from "@/pages/dashboard/olt/UserDownCount";
import FiberDownFinder from "@/pages/dashboard/olt/FiberDownFinder";
import OltSharing from "@/pages/dashboard/olt/OltSharing";

// Network Monitoring
import SwitchList from "@/pages/dashboard/monitoring/SwitchList";
import AddSwitch from "@/pages/dashboard/monitoring/AddSwitch";
import PopDass from "@/pages/dashboard/monitoring/PopDass";
import PopIp from "@/pages/dashboard/monitoring/PopIp";
import PopLog from "@/pages/dashboard/monitoring/PopLog";
import PingTools from "@/pages/dashboard/monitoring/PingTools";
import PopDevices from "@/pages/dashboard/monitoring/PopDevices";
import OnlineClientMonitoring from "@/pages/dashboard/monitoring/OnlineClientMonitoring";

// Network
import NetworkDiagram from "@/pages/dashboard/network/Diagram";
import NetworkPop from "@/pages/dashboard/network/Pop";
import NetworkClients from "@/pages/dashboard/network/NetworkClients";
import NetworkConnections from "@/pages/dashboard/network/Connections";
import NetworkDistributedItems from "@/pages/dashboard/network/DistributedItems";
import NetworkMap from "@/pages/dashboard/network/Map";

// Leave
import LeaveCategories from "@/pages/dashboard/leave/Categories";
import LeaveSetup from "@/pages/dashboard/leave/Setup";
import LeaveApply from "@/pages/dashboard/leave/Apply";
import LeaveApproval from "@/pages/dashboard/leave/Approval";

// Branch
import BranchTariff from "@/pages/dashboard/branches/Tariff";
import BranchAddManager from "@/pages/dashboard/branches/AddManager";
import BranchManagers from "@/pages/dashboard/branches/Managers";
import PopProfile from "@/pages/dashboard/branches/PopProfile";
import BranchFunding from "@/pages/dashboard/branches/Funding";
import BranchPgwPayments from "@/pages/dashboard/branches/PgwPayments";
import BranchPgwSettlement from "@/pages/dashboard/branches/PgwSettlement";
import BranchPopNotice from "@/pages/dashboard/branches/PopNotice";

// Events
import Events from "@/pages/dashboard/events/Events";

// Support
import SupportCategories from "@/pages/dashboard/support/SupportCategories";
import SupportTickets from "@/pages/dashboard/support/Tickets";
import SupportHistory from "@/pages/dashboard/support/History";

// Tasks
import TaskCategories from "@/pages/dashboard/tasks/TaskCategories";
import Tasks from "@/pages/dashboard/tasks/Tasks";
import TaskHistory from "@/pages/dashboard/tasks/TaskHistory";

// BW Buy
import BwBuyItems from "@/pages/dashboard/bw-buy/Items";
import BwBuyCategories from "@/pages/dashboard/bw-buy/Categories";
import BwBuyProviders from "@/pages/dashboard/bw-buy/Providers";
import BwBuyBills from "@/pages/dashboard/bw-buy/Bills";
import BwBuyBillForm from "@/pages/dashboard/bw-buy/BillForm";
import BwBuyBillView from "@/pages/dashboard/bw-buy/BillView";

// BW Sale
import BwSalePop from "@/pages/dashboard/bw-sale/Pop";
import BwSaleInvoices from "@/pages/dashboard/bw-sale/Invoices";
import BwSaleInvoiceForm from "@/pages/dashboard/bw-sale/InvoiceForm";
import BwSaleInvoiceDetail from "@/pages/dashboard/bw-sale/InvoiceDetail";
import BwSaleCollection from "@/pages/dashboard/bw-sale/Collection";
import BwSaleRecurring from "@/pages/dashboard/bw-sale/Recurring";
import BwSaleCustomerView from "@/pages/dashboard/bw-sale/CustomerView";
import BwSaleServices from "@/pages/dashboard/bw-sale/Services";
import BwSaleSubscriptions from "@/pages/dashboard/bw-sale/Subscriptions";

// Purchase
import PurchaseVendors from "@/pages/dashboard/purchases/Vendors";
import PurchaseRequisitions from "@/pages/dashboard/purchases/Requisitions";
import PurchaseList from "@/pages/dashboard/purchases/Purchases";
import PurchaseBills from "@/pages/dashboard/purchases/PurchaseBills";

// Sales & Service
import SalesProductInvoice from "@/pages/dashboard/sales/ProductInvoice";
import SalesServiceInvoice from "@/pages/dashboard/sales/ServiceInvoice";
import SalesInstallationFee from "@/pages/dashboard/sales/InstallationFee";

// Inventory
import InventoryUnits from "@/pages/dashboard/inventory/Units";
import InventoryLocations from "@/pages/dashboard/inventory/Locations";
import InventoryCategories from "@/pages/dashboard/inventory/InventoryCategories";
import InventoryItems from "@/pages/dashboard/inventory/InventoryItems";
import InventoryStock from "@/pages/dashboard/inventory/Stock";

// Assets
import AssetList from "@/pages/dashboard/assets/AssetList";
import AssetDestroyed from "@/pages/dashboard/assets/Destroyed";

// Accounting
import AccountingDashboard from "@/pages/dashboard/accounting/AccountingDashboard";
import AccountingChart from "@/pages/dashboard/accounting/ChartOfAccounts";
import AccountingIncome from "@/pages/dashboard/accounting/Income";
import AccountingExpense from "@/pages/dashboard/accounting/Expense";
import AccountingJournal from "@/pages/dashboard/accounting/Journal";
import AccountingTransactions from "@/pages/dashboard/accounting/Transactions";
import AccountingBalances from "@/pages/dashboard/accounting/Balances";
import AccountingBalanceSheet from "@/pages/dashboard/accounting/BalanceSheet";
import AccountingProfitLoss from "@/pages/dashboard/accounting/ProfitLoss";
import AccountingComparePL from "@/pages/dashboard/accounting/ComparePL";
import AccountingTrialBalance from "@/pages/dashboard/accounting/TrialBalance";
import AccountingCashBook from "@/pages/dashboard/accounting/CashBook";

// Reports
import ReportBillCollection from "@/pages/dashboard/reports/BillCollection";
import ReportDiscount from "@/pages/dashboard/reports/Discount";
import ReportCustomer from "@/pages/dashboard/reports/Customer";
import ReportMessages from "@/pages/dashboard/reports/Messages";
import ReportDueSms from "@/pages/dashboard/reports/DueSms";
import ReportProcessingFee from "@/pages/dashboard/reports/ProcessingFee";
import ReportBtrc from "@/pages/dashboard/reports/Btrc";
import ReportFinancial from "@/pages/dashboard/reports/Financial";

// SMS
import SmsIndividual from "@/pages/dashboard/sms/Individual";
import SmsTemplates from "@/pages/dashboard/sms/Templates";
import SmsGroups from "@/pages/dashboard/sms/Groups";
import SmsSend from "@/pages/dashboard/sms/Send";
import SmsGateway from "@/pages/dashboard/sms/Gateway";

// Affiliation
import AffiliationPartners from "@/pages/dashboard/affiliation/Partners";
import AffiliationAdd from "@/pages/dashboard/affiliation/AddAffiliator";

// System
import SystemUsers from "@/pages/dashboard/system/Users";
import UserReview from "@/pages/dashboard/system/UserReview";
import SystemCompany from "@/pages/dashboard/system/Company";
import SystemInvoice from "@/pages/dashboard/system/Invoice";
import SystemPeriods from "@/pages/dashboard/system/Periods";
import SystemPaymentGateways from "@/pages/dashboard/system/PaymentGateways";
import SystemEmail from "@/pages/dashboard/system/Email";
import SystemSetup from "@/pages/dashboard/system/Setup";
import SystemProcessingFee from "@/pages/dashboard/system/SysProcessingFee";
import SystemRoles from "@/pages/dashboard/system/Roles";
import SystemOltPermissions from "@/pages/dashboard/system/OltPermissions";
import SystemLog from "@/pages/dashboard/system/SystemLog";

// Config (additional)
import ConfigServiceTypes from "@/pages/dashboard/config/ServiceTypes";

// Website Panel
import WebsiteDashboard from "@/pages/dashboard/website/WebsiteDashboard";
import HomepageEditor from "@/pages/dashboard/website/HomepageEditor";
import WebsitePages from "@/pages/dashboard/website/WebsitePages";
import WebsiteNotices from "@/pages/dashboard/website/WebsiteNotices";
import WebsiteOffers from "@/pages/dashboard/website/WebsiteOffers";
import WebsiteTestimonials from "@/pages/dashboard/website/WebsiteTestimonials";
import WebsitePartners from "@/pages/dashboard/website/WebsitePartners";
import WebsiteFeatures from "@/pages/dashboard/website/WebsiteFeatures";
import WebsiteServices from "@/pages/dashboard/website/WebsiteServices";
import WebsiteFestivals from "@/pages/dashboard/website/WebsiteFestivals";
import WebsiteMenu from "@/pages/dashboard/website/WebsiteMenu";

import WebsiteMedia from "@/pages/dashboard/website/WebsiteMedia";
import WebsiteAbout from "@/pages/dashboard/website/WebsiteAbout";
import WebsiteSettings from "@/pages/dashboard/website/WebsiteSettings";

// Portal
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import PortalProtectedRoute from "@/components/PortalProtectedRoute";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalInvoices from "@/pages/portal/PortalInvoices";
import PortalPurchaseOrders from "@/pages/portal/PortalPurchaseOrders";
import PortalSupport from "@/pages/portal/PortalSupport";
import PortalNotices from "@/pages/portal/PortalNotices";
import PortalCompanyInfo from "@/pages/portal/PortalCompanyInfo";
import PortalMediaServers from "@/pages/portal/PortalMediaServers";
import PortalLedger from "@/pages/portal/PortalLedger";
import PortalLiveUsage from "@/pages/portal/PortalLiveUsage";
import PortalSpeedTest from "@/pages/portal/PortalSpeedTest";

// Reseller
import ResellerProtectedRoute from "@/components/ResellerProtectedRoute";
import { ResellerLayout } from "@/components/ResellerLayout";
import ResellerDashboard from "@/pages/reseller/ResellerDashboard";
import ResellerInvoices from "@/pages/reseller/ResellerInvoices";
import ResellerInvoiceDetail from "@/pages/reseller/ResellerInvoiceDetail";
import ResellerInvoicePrint from "@/pages/reseller/ResellerInvoicePrint";
import ResellerPurchaseOrders from "@/pages/reseller/ResellerPurchaseOrders";
import ResellerPurchaseOrderForm from "@/pages/reseller/ResellerPurchaseOrderForm";
import ResellerTickets from "@/pages/reseller/ResellerTickets";
import ResellerUsers from "@/pages/reseller/ResellerUsers";
import ResellerSettings from "@/pages/reseller/ResellerSettings";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
);

const Pub = ({ children }: { children: React.ReactNode }) => (
  <PublicLayout>{children}</PublicLayout>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Website */}
              <Route path="/" element={<Pub><Home /></Pub>} />
              <Route path="/packages" element={<Pub><Packages /></Pub>} />
              <Route path="/coverage" element={<Pub><Coverage /></Pub>} />
              <Route path="/new-connection" element={<Pub><NewConnection /></Pub>} />
              <Route path="/quick-pay" element={<Pub><QuickPay /></Pub>} />
              <Route path="/services" element={<Pub><Services /></Pub>} />
              <Route path="/about" element={<Pub><About /></Pub>} />
              <Route path="/contact" element={<Pub><Contact /></Pub>} />
              <Route path="/offers" element={<Pub><Offers /></Pub>} />
              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<P><Dashboard /></P>} />
              <Route path="/dashboard/olt-overview" element={<P><OltOverview /></P>} />

              {/* Config */}
              <Route path="/dashboard/config/zones" element={<P><ConfigZones /></P>} />
              <Route path="/dashboard/config/sub-zones" element={<P><ConfigSubZones /></P>} />
              <Route path="/dashboard/config/boxes" element={<P><ConfigBoxes /></P>} />
              <Route path="/dashboard/config/connection-types" element={<P><ConfigConnectionTypes /></P>} />
              <Route path="/dashboard/config/client-types" element={<P><ConfigClientTypes /></P>} />
              <Route path="/dashboard/config/protocol-types" element={<P><ConfigProtocolTypes /></P>} />
              <Route path="/dashboard/config/billing-statuses" element={<P><ConfigBillingStatuses /></P>} />
              <Route path="/dashboard/config/packages" element={<P><ConfigPackages /></P>} />
              <Route path="/dashboard/config/divisions" element={<P><ConfigDivisions /></P>} />
              <Route path="/dashboard/config/districts" element={<P><ConfigDistricts /></P>} />
              <Route path="/dashboard/config/upazilas" element={<P><ConfigUpazilas /></P>} />

              {/* VAS */}
              <Route path="/dashboard/vas/config" element={<P><VasConfig /></P>} />
              <Route path="/dashboard/vas/subscriptions" element={<P><VasSubscriptions /></P>} />
              <Route path="/dashboard/vas/transactions" element={<P><VasTransactions /></P>} />

              {/* Client */}
              <Route path="/dashboard/clients/new-request" element={<P><ClientNewRequest /></P>} />
              <Route path="/dashboard/clients/add" element={<P><ClientAdd /></P>} />
              <Route path="/dashboard/clients" element={<P><ClientList /></P>} />
              <Route path="/dashboard/clients/left" element={<P><ClientLeft /></P>} />
              <Route path="/dashboard/clients/scheduler" element={<P><ClientScheduler /></P>} />
              <Route path="/dashboard/clients/change-request" element={<P><ClientChangeRequest /></P>} />
              <Route path="/dashboard/clients/portal-manage" element={<P><ClientPortalManage /></P>} />

              {/* Billing */}
              <Route path="/dashboard/billing" element={<P><BillingList /></P>} />
              <Route path="/dashboard/billing/client/:id" element={<P><ClientProfile /></P>} />
              <Route path="/dashboard/billing/daily-collection" element={<P><BillingDailyCollection /></P>} />

              {/* Mikrotik */}
              <Route path="/dashboard/mikrotik/servers" element={<P><MikrotikServers /></P>} />
              <Route path="/dashboard/mikrotik/backup" element={<P><MikrotikBackup /></P>} />
              <Route path="/dashboard/mikrotik/import" element={<P><MikrotikImport /></P>} />
              <Route path="/dashboard/mikrotik/bulk-import" element={<P><MikrotikBulkImport /></P>} />

              {/* HR */}
              <Route path="/dashboard/hr/departments" element={<P><HrDepartments /></P>} />
              <Route path="/dashboard/hr/payheads" element={<P><HrPayheads /></P>} />
              <Route path="/dashboard/hr/payroll" element={<P><HrPayroll /></P>} />
              <Route path="/dashboard/hr/positions" element={<P><HrPositions /></P>} />
              <Route path="/dashboard/hr/payslip" element={<P><HrPayslip /></P>} />
              <Route path="/dashboard/hr/employees/add" element={<P><HrAddEmployee /></P>} />
              <Route path="/dashboard/hr/employees" element={<P><HrEmployees /></P>} />
              <Route path="/dashboard/hr/salary-sheet" element={<P><HrSalarySheet /></P>} />
              <Route path="/dashboard/hr/resign-rules" element={<P><HrResignRules /></P>} />
              <Route path="/dashboard/hr/resignations" element={<P><HrResignations /></P>} />
              <Route path="/dashboard/hr/rejoin" element={<P><HrRejoin /></P>} />
              <Route path="/dashboard/hr/attendance" element={<P><HrAttendance /></P>} />
              <Route path="/dashboard/hr/shifts" element={<P><HrShiftManagement /></P>} />
              <Route path="/dashboard/hr/zkteco-devices" element={<P><HrZktecoDevices /></P>} />
              <Route path="/dashboard/hr/attendance-rules" element={<P><HrAttendanceRules /></P>} />
              <Route path="/dashboard/hr/settings" element={<P><HrSettings /></P>} />

              {/* OLT */}
              <Route path="/dashboard/olt" element={<P><OltDevices /></P>} />
              <Route path="/dashboard/olt/onu" element={<P><OnuList /></P>} />
              <Route path="/dashboard/olt/users" element={<P><OltUsers /></P>} />
              <Route path="/dashboard/olt/user-down" element={<P><UserDownCount /></P>} />
              <Route path="/dashboard/olt/fiber-down" element={<P><FiberDownFinder /></P>} />
              <Route path="/dashboard/olt/sharing" element={<P><OltSharing /></P>} />

              {/* Network Monitoring */}
              <Route path="/dashboard/monitoring/online" element={<P><OnlineClientMonitoring /></P>} />
              <Route path="/dashboard/monitoring/switches" element={<P><SwitchList /></P>} />
              <Route path="/dashboard/monitoring/add-switch" element={<P><AddSwitch /></P>} />
              <Route path="/dashboard/monitoring/pop-dass" element={<P><PopDass /></P>} />
              <Route path="/dashboard/monitoring/pop-ip" element={<P><PopIp /></P>} />
              <Route path="/dashboard/monitoring/pop-log" element={<P><PopLog /></P>} />
              <Route path="/dashboard/monitoring/ping-tools" element={<P><PingTools /></P>} />
              <Route path="/dashboard/monitoring/pop-devices" element={<P><PopDevices /></P>} />

              {/* Network */}
              <Route path="/dashboard/network/diagram" element={<P><NetworkDiagram /></P>} />
              <Route path="/dashboard/network/pop" element={<P><NetworkPop /></P>} />
              <Route path="/dashboard/network/clients" element={<P><NetworkClients /></P>} />
              <Route path="/dashboard/network/connections" element={<P><NetworkConnections /></P>} />
              <Route path="/dashboard/network/distributed-items" element={<P><NetworkDistributedItems /></P>} />
              <Route path="/dashboard/network/map" element={<P><NetworkMap /></P>} />

              {/* Leave */}
              <Route path="/dashboard/leave/categories" element={<P><LeaveCategories /></P>} />
              <Route path="/dashboard/leave/setup" element={<P><LeaveSetup /></P>} />
              <Route path="/dashboard/leave/apply" element={<P><LeaveApply /></P>} />
              <Route path="/dashboard/leave/approval" element={<P><LeaveApproval /></P>} />

              {/* Branch */}
              <Route path="/dashboard/branches/tariff" element={<P><BranchTariff /></P>} />
              <Route path="/dashboard/branches/add-manager" element={<P><BranchAddManager /></P>} />
              <Route path="/dashboard/branches/managers" element={<P><BranchManagers /></P>} />
              <Route path="/dashboard/branches/pop/:id" element={<P><PopProfile /></P>} />
              <Route path="/dashboard/branches/funding" element={<P><BranchFunding /></P>} />
              <Route path="/dashboard/branches/pgw-payments" element={<P><BranchPgwPayments /></P>} />
              <Route path="/dashboard/branches/pgw-settlement" element={<P><BranchPgwSettlement /></P>} />
              <Route path="/dashboard/branches/pop-notice" element={<P><BranchPopNotice /></P>} />

              {/* Events */}
              <Route path="/dashboard/events" element={<P><Events /></P>} />

              {/* Support */}
              <Route path="/dashboard/support/categories" element={<P><SupportCategories /></P>} />
              <Route path="/dashboard/support/tickets" element={<P><SupportTickets /></P>} />
              <Route path="/dashboard/support/history" element={<P><SupportHistory /></P>} />

              {/* Tasks */}
              <Route path="/dashboard/tasks/categories" element={<P><TaskCategories /></P>} />
              <Route path="/dashboard/tasks" element={<P><Tasks /></P>} />
              <Route path="/dashboard/tasks/history" element={<P><TaskHistory /></P>} />

              {/* BW Buy */}
              <Route path="/dashboard/bw-buy/items" element={<P><BwBuyItems /></P>} />
              <Route path="/dashboard/bw-buy/categories" element={<P><BwBuyCategories /></P>} />
              <Route path="/dashboard/bw-buy/providers" element={<P><BwBuyProviders /></P>} />
              <Route path="/dashboard/bw-buy/bills" element={<P><BwBuyBills /></P>} />
              <Route path="/dashboard/bw-buy/bills/new" element={<P><BwBuyBillForm /></P>} />
              <Route path="/dashboard/bw-buy/bills/:id" element={<P><BwBuyBillView /></P>} />
              <Route path="/dashboard/bw-buy/bills/:id/edit" element={<P><BwBuyBillForm /></P>} />

              {/* BW Sale */}
              <Route path="/dashboard/bw-sale/pop" element={<P><BwSalePop /></P>} />
              <Route path="/dashboard/bw-sale/pop/:id" element={<P><BwSaleCustomerView /></P>} />
              <Route path="/dashboard/bw-sale/services" element={<P><BwSaleServices /></P>} />
              <Route path="/dashboard/bw-sale/subscriptions" element={<P><BwSaleSubscriptions /></P>} />
              <Route path="/dashboard/bw-sale/invoices" element={<P><BwSaleInvoices /></P>} />
              <Route path="/dashboard/bw-sale/invoices/new" element={<P><BwSaleInvoiceForm /></P>} />
              <Route path="/dashboard/bw-sale/invoices/:id" element={<P><BwSaleInvoiceDetail /></P>} />
              <Route path="/dashboard/bw-sale/invoices/:id/edit" element={<P><BwSaleInvoiceForm /></P>} />
              <Route path="/dashboard/bw-sale/collection" element={<P><BwSaleCollection /></P>} />
              <Route path="/dashboard/bw-sale/recurring" element={<P><BwSaleRecurring /></P>} />

              {/* Purchase */}
              <Route path="/dashboard/purchases/vendors" element={<P><PurchaseVendors /></P>} />
              <Route path="/dashboard/purchases/requisitions" element={<P><PurchaseRequisitions /></P>} />
              <Route path="/dashboard/purchases" element={<P><PurchaseList /></P>} />
              <Route path="/dashboard/purchases/bills" element={<P><PurchaseBills /></P>} />

              {/* Sales & Service */}
              <Route path="/dashboard/sales/product-invoice" element={<P><SalesProductInvoice /></P>} />
              <Route path="/dashboard/sales/service-invoice" element={<P><SalesServiceInvoice /></P>} />
              <Route path="/dashboard/sales/installation-fee" element={<P><SalesInstallationFee /></P>} />

              {/* Inventory */}
              <Route path="/dashboard/inventory/units" element={<P><InventoryUnits /></P>} />
              <Route path="/dashboard/inventory/locations" element={<P><InventoryLocations /></P>} />
              <Route path="/dashboard/inventory/categories" element={<P><InventoryCategories /></P>} />
              <Route path="/dashboard/inventory/items" element={<P><InventoryItems /></P>} />
              <Route path="/dashboard/inventory/stock" element={<P><InventoryStock /></P>} />

              {/* Assets */}
              <Route path="/dashboard/assets" element={<P><AssetList /></P>} />
              <Route path="/dashboard/assets/destroyed" element={<P><AssetDestroyed /></P>} />

              {/* Accounting */}
              <Route path="/dashboard/accounting" element={<P><AccountingDashboard /></P>} />
              <Route path="/dashboard/accounting/chart" element={<P><AccountingChart /></P>} />
              <Route path="/dashboard/accounting/income" element={<P><AccountingIncome /></P>} />
              <Route path="/dashboard/accounting/expense" element={<P><AccountingExpense /></P>} />
              <Route path="/dashboard/accounting/journal" element={<P><AccountingJournal /></P>} />
              <Route path="/dashboard/accounting/transactions" element={<P><AccountingTransactions /></P>} />
              <Route path="/dashboard/accounting/balances" element={<P><AccountingBalances /></P>} />
              <Route path="/dashboard/accounting/balance-sheet" element={<P><AccountingBalanceSheet /></P>} />
              <Route path="/dashboard/accounting/profit-loss" element={<P><AccountingProfitLoss /></P>} />
              <Route path="/dashboard/accounting/compare-pl" element={<P><AccountingComparePL /></P>} />
              <Route path="/dashboard/accounting/trial-balance" element={<P><AccountingTrialBalance /></P>} />
              <Route path="/dashboard/accounting/cash-book" element={<P><AccountingCashBook /></P>} />

              {/* Reports */}
              <Route path="/dashboard/reports/bill-collection" element={<P><ReportBillCollection /></P>} />
              <Route path="/dashboard/reports/discount" element={<P><ReportDiscount /></P>} />
              <Route path="/dashboard/reports/customer" element={<P><ReportCustomer /></P>} />
              <Route path="/dashboard/reports/messages" element={<P><ReportMessages /></P>} />
              <Route path="/dashboard/reports/due-sms" element={<P><ReportDueSms /></P>} />
              <Route path="/dashboard/reports/processing-fee" element={<P><ReportProcessingFee /></P>} />
              <Route path="/dashboard/reports/btrc" element={<P><ReportBtrc /></P>} />
              <Route path="/dashboard/reports/financial" element={<P><ReportFinancial /></P>} />

              {/* SMS */}
              <Route path="/dashboard/sms/individual" element={<P><SmsIndividual /></P>} />
              <Route path="/dashboard/sms/templates" element={<P><SmsTemplates /></P>} />
              <Route path="/dashboard/sms/groups" element={<P><SmsGroups /></P>} />
              <Route path="/dashboard/sms/send" element={<P><SmsSend /></P>} />
              <Route path="/dashboard/sms/gateway" element={<P><SmsGateway /></P>} />

              {/* Affiliation */}
              <Route path="/dashboard/affiliation/partners" element={<P><AffiliationPartners /></P>} />
              <Route path="/dashboard/affiliation/add" element={<P><AffiliationAdd /></P>} />

              {/* System */}
              <Route path="/dashboard/system/users" element={<P><SystemUsers /></P>} />
              <Route path="/dashboard/system/users/:id" element={<P><UserReview /></P>} />
              <Route path="/dashboard/system/company" element={<P><SystemCompany /></P>} />
              <Route path="/dashboard/system/invoice" element={<P><SystemInvoice /></P>} />
              <Route path="/dashboard/system/periods" element={<P><SystemPeriods /></P>} />
              <Route path="/dashboard/system/payment-gateways" element={<P><SystemPaymentGateways /></P>} />
              <Route path="/dashboard/system/email" element={<P><SystemEmail /></P>} />
              <Route path="/dashboard/system/setup" element={<P><SystemSetup /></P>} />
              <Route path="/dashboard/system/processing-fee" element={<P><SystemProcessingFee /></P>} />
              <Route path="/dashboard/system/roles" element={<P><SystemRoles /></P>} />
              <Route path="/dashboard/system/olt-permissions" element={<P><SystemOltPermissions /></P>} />
              <Route path="/dashboard/system/system-log" element={<P><SystemLog /></P>} />

              {/* Config (additional) */}
              <Route path="/dashboard/config/service-types" element={<P><ConfigServiceTypes /></P>} />

              {/* Website Panel */}
              <Route path="/dashboard/website" element={<P><WebsiteDashboard /></P>} />
              <Route path="/dashboard/website/homepage" element={<P><HomepageEditor /></P>} />
              <Route path="/dashboard/website/packages" element={<Navigate to="/dashboard/config/packages" replace />} />
              <Route path="/dashboard/website/coverage" element={<Navigate to="/dashboard/config/districts" replace />} />
              <Route path="/dashboard/website/orders" element={<Navigate to="/dashboard/clients/new-request" replace />} />
              <Route path="/dashboard/website/pages" element={<P><WebsitePages /></P>} />
              <Route path="/dashboard/website/notices" element={<P><WebsiteNotices /></P>} />
              <Route path="/dashboard/website/offers" element={<P><WebsiteOffers /></P>} />
              <Route path="/dashboard/website/testimonials" element={<P><WebsiteTestimonials /></P>} />
              <Route path="/dashboard/website/partners" element={<P><WebsitePartners /></P>} />
              <Route path="/dashboard/website/features" element={<P><WebsiteFeatures /></P>} />
              <Route path="/dashboard/website/services" element={<P><WebsiteServices /></P>} />
              <Route path="/dashboard/website/festivals" element={<P><WebsiteFestivals /></P>} />
              <Route path="/dashboard/website/menu" element={<P><WebsiteMenu /></P>} />
              <Route path="/dashboard/website/payments" element={<Navigate to="/dashboard/system/payment-gateways" replace />} />
              <Route path="/dashboard/website/media" element={<P><WebsiteMedia /></P>} />
              <Route path="/dashboard/website/about" element={<P><WebsiteAbout /></P>} />
              <Route path="/dashboard/website/settings" element={<P><WebsiteSettings /></P>} />

              {/* Portal */}
              <Route path="/portal/login" element={<PortalAuthProvider><PortalLogin /></PortalAuthProvider>} />
              <Route path="/portal/dashboard" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalDashboard /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/invoices" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalInvoices /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/purchase-orders" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalPurchaseOrders /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/support" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalSupport /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/notices" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalNotices /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/company" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalCompanyInfo /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/media" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalMediaServers /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/ledger" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalLedger /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/live-usage" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalLiveUsage /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/speed-test" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalSpeedTest /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />

              {/* Reseller Portal */}
              <Route path="/reseller" element={<Navigate to="/reseller/dashboard" replace />} />
              <Route path="/reseller/login" element={<Navigate to="/login" replace />} />
              <Route path="/reseller/dashboard" element={<PortalAuthProvider><ResellerProtectedRoute require="dashboard"><ResellerLayout><ResellerDashboard /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/invoices" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerLayout><ResellerInvoices /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/invoices/:id" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerLayout><ResellerInvoiceDetail /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/invoices/:id/print" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerInvoicePrint /></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/purchases" element={<PortalAuthProvider><ResellerProtectedRoute require="purchases"><ResellerLayout><ResellerPurchaseOrders /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/purchases/new" element={<PortalAuthProvider><ResellerProtectedRoute require="purchases"><ResellerLayout><ResellerPurchaseOrderForm /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/tickets" element={<PortalAuthProvider><ResellerProtectedRoute require="tickets"><ResellerLayout><ResellerTickets /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/users" element={<PortalAuthProvider><ResellerProtectedRoute require="users"><ResellerLayout><ResellerUsers /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/reseller/settings" element={<PortalAuthProvider><ResellerProtectedRoute require="settings"><ResellerLayout><ResellerSettings /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
