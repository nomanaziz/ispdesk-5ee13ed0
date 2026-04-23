import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { useGlobalLoading } from "@/stores/useGlobalLoading";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
import Shop from "@/pages/public/Shop";
import ShopProduct from "@/pages/public/ShopProduct";
import Cart from "@/pages/public/Cart";
import Checkout from "@/pages/public/Checkout";
import OrderTrack from "@/pages/public/OrderTrack";

// Shop Admin
import ShopCategories from "@/pages/dashboard/shop/Categories";
import ShopProducts from "@/pages/dashboard/shop/Products";
import ShopProductForm from "@/pages/dashboard/shop/ProductForm";
import ShopOrders from "@/pages/dashboard/shop/Orders";
import ShopOrderDetail from "@/pages/dashboard/shop/OrderDetail";
import ShopShippingZones from "@/pages/dashboard/shop/ShippingZones";
import ShopCoupons from "@/pages/dashboard/shop/Coupons";
import WarrantyClaims from "@/pages/dashboard/shop/WarrantyClaims";
import ShopSalesReport from "@/pages/dashboard/shop/SalesReport";
import AdminCreateOrder from "@/pages/dashboard/shop/AdminCreateOrder";

// Auth pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import CompanyOverview from "./pages/dashboard/CompanyOverview";
import OltOverview from "./pages/dashboard/OltOverview";
import IconPreview from "./pages/dashboard/dev/IconPreview";
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
import ConfigLocations from "@/pages/dashboard/config/Locations";

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
import BillingCycleSettings from "@/pages/dashboard/billing/BillingCycleSettings";

// Mikrotik
import MikrotikServers from "@/pages/dashboard/mikrotik/Servers";
import MikrotikBackup from "@/pages/dashboard/mikrotik/Backup";
import MikrotikImport from "@/pages/dashboard/mikrotik/Import";
import MikrotikBulkImport from "@/pages/dashboard/mikrotik/BulkImport";

// Device Administration
import DeviceAdminDashboard from "@/pages/dashboard/device-admin/Dashboard";
import DeviceAdminDevices from "@/pages/dashboard/device-admin/Devices";
import DeviceAdminAllUsers from "@/pages/dashboard/device-admin/AllDeviceUsers";
import DeviceAdminGroups from "@/pages/dashboard/device-admin/Groups";
import DeviceAdminBackups from "@/pages/dashboard/device-admin/Backups";
import DeviceAdminSchedules from "@/pages/dashboard/device-admin/Schedules";
import DeviceAdminAuditLog from "@/pages/dashboard/device-admin/AuditLog";
import DeviceAdminJobs from "@/pages/dashboard/device-admin/Jobs";

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
import DashboardLinks from "@/pages/dashboard/Links";

// OLT
import OltDevices from "@/pages/dashboard/olt/OltDevices";
import OltUsers from "@/pages/dashboard/olt/OltUsers";
import OltPorts from "@/pages/dashboard/olt/OltPorts";
import OnuList from "@/pages/dashboard/olt/OnuList";
import OnuDetail from "@/pages/dashboard/olt/OnuDetail";
import PowerDashboard from "@/pages/dashboard/olt/PowerDashboard";
import UserDownCount from "@/pages/dashboard/olt/UserDownCount";
import FiberDownFinder from "@/pages/dashboard/olt/FiberDownFinder";
import OltSharing from "@/pages/dashboard/olt/OltSharing";

import NetworkSwitchList from "@/pages/dashboard/network/SwitchList";
import NetworkSwitchDetail from "@/pages/dashboard/network/SwitchDetail";

// Network Monitoring
import SwitchList from "@/pages/dashboard/monitoring/SwitchList";
import AddSwitch from "@/pages/dashboard/monitoring/AddSwitch";
import PopDass from "@/pages/dashboard/monitoring/PopDass";
import PopIp from "@/pages/dashboard/monitoring/PopIp";
import PopLog from "@/pages/dashboard/monitoring/PopLog";
import PingTools from "@/pages/dashboard/monitoring/PingTools";
import PopDevices from "@/pages/dashboard/monitoring/PopDevices";
import OnlineClientMonitoring from "@/pages/dashboard/monitoring/OnlineClientMonitoring";
import LiveTraffic from "@/pages/dashboard/monitoring/LiveTraffic";

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
import BranchEditManager from "@/pages/dashboard/branches/EditManager";
import BranchManagers from "@/pages/dashboard/branches/Managers";
import PopProfile from "@/pages/dashboard/branches/PopProfile";
import BranchFunding from "@/pages/dashboard/branches/Funding";
import BranchFundingHistory from "@/pages/dashboard/branches/FundingHistory";
import BranchPgwTransactions from "@/pages/dashboard/branches/PgwTransactions";


// Events
import Events from "@/pages/dashboard/events/Events";

// Support
import SupportCategories from "@/pages/dashboard/support/SupportCategories";
import SupportTickets from "@/pages/dashboard/support/Tickets";
import SupportHistory from "@/pages/dashboard/support/History";
import SupportNotices from "@/pages/dashboard/support/Notices";

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
import BwBuySubscriptions from "@/pages/dashboard/bw-buy/Subscriptions";

// BW Sale
import BwSalePop from "@/pages/dashboard/bw-sale/Pop";
import BwSaleInvoices from "@/pages/dashboard/bw-sale/Invoices";
import BwSaleInvoiceForm from "@/pages/dashboard/bw-sale/InvoiceForm";
import BwSaleInvoiceDetail from "@/pages/dashboard/bw-sale/InvoiceDetail";
import BwSaleCollection from "@/pages/dashboard/bw-sale/Collection";
import BwSaleRecurring from "@/pages/dashboard/bw-sale/Recurring";
import BwSaleCustomerView from "@/pages/dashboard/bw-sale/CustomerView";
import BwSaleServices from "@/pages/dashboard/bw-sale/Services";
import BwSaleRecurringForm from "@/pages/dashboard/bw-sale/RecurringForm";

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
import PopSmsTemplates from "@/pages/reseller/PopSmsTemplates";
import PopSmsIndividual from "@/pages/reseller/sms/PopSmsIndividual";
import PopSmsSend from "@/pages/reseller/sms/PopSmsSend";
import PopSmsGateway from "@/pages/reseller/sms/PopSmsGateway";
import PopTelegramSetup from "@/pages/reseller/sms/PopTelegramSetup";
import TelegramSetup from "@/pages/dashboard/sms/TelegramSetup";
import SmsTemplates from "@/pages/dashboard/sms/Templates";
import SmsGroups from "@/pages/dashboard/sms/Groups";
import SmsSend from "@/pages/dashboard/sms/Send";
import SmsGateway from "@/pages/dashboard/sms/Gateway";

// System
import SystemCompany from "@/pages/dashboard/system/Company";
import SystemInvoice from "@/pages/dashboard/system/Invoice";
import SystemPeriods from "@/pages/dashboard/system/Periods";
import SystemPaymentGateways from "@/pages/dashboard/system/PaymentGateways";
import SystemEmail from "@/pages/dashboard/system/Email";
import SystemSetup from "@/pages/dashboard/system/Setup";
import SystemProcessingFee from "@/pages/dashboard/system/SysProcessingFee";
import SystemLog from "@/pages/dashboard/system/SystemLog";
import SystemBillPeriodYears from "@/pages/dashboard/system/BillPeriodYears";
import SystemAutomaticProcess from "@/pages/dashboard/system/AutomaticProcess";

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

// Notes
import AdminNotes from "@/pages/notes/AdminNotes";
import PopNotes from "@/pages/notes/PopNotes";
import ClientNotes from "@/pages/notes/ClientNotes";

// Portal
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import PortalProtectedRoute from "@/components/PortalProtectedRoute";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalInvoices from "@/pages/portal/PortalInvoices";

import PortalSupport from "@/pages/portal/PortalSupport";
import PortalNotices from "@/pages/portal/PortalNotices";
import PortalCompanyInfo from "@/pages/portal/PortalCompanyInfo";
import PortalMediaServers from "@/pages/portal/PortalMediaServers";
import PortalLedger from "@/pages/portal/PortalLedger";
import PortalLiveUsage from "@/pages/portal/PortalLiveUsage";
import PortalSpeedTest from "@/pages/portal/PortalSpeedTest";
import PortalShop from "@/pages/portal/PortalShop";
import PortalShopCheckout from "@/pages/portal/PortalShopCheckout";
import PortalMyOrders from "@/pages/portal/PortalMyOrders";
import PortalBills from "@/pages/portal/PortalBills";
import PortalBillInvoice from "@/pages/portal/PortalBillInvoice";
import PortalProfile from "@/pages/portal/PortalProfile";
import PortalMessages from "@/pages/portal/PortalMessages";
import PortalChangeRequest from "@/pages/portal/PortalChangeRequest";
import UserUpdateRequests from "@/pages/dashboard/clients/UserUpdateRequests";

// Reseller (POP Admin) Portal
import ResellerProtectedRoute from "@/components/ResellerProtectedRoute";
import { ResellerLayout } from "@/components/ResellerLayout";
import ResellerDashboard from "@/pages/reseller/ResellerDashboard";
import ResellerInvoices from "@/pages/reseller/ResellerInvoices";
import ResellerInvoiceDetail from "@/pages/reseller/ResellerInvoiceDetail";
import ResellerInvoicePrint from "@/pages/reseller/ResellerInvoicePrint";
import ResellerTickets from "@/pages/reseller/ResellerTickets";
import ResellerUsers from "@/pages/reseller/ResellerUsers";
import ResellerSettings from "@/pages/reseller/ResellerSettings";
import ResellerMikrotikUsers from "@/pages/reseller/ResellerMikrotikUsers";
import ResellerMikrotikBulkCreate from "@/pages/reseller/ResellerMikrotikBulkCreate";
// POP-scoped Configuration (admin pages reused; only Packages & AllotedAreas remain POP-specific)
import PopPackages from "@/pages/reseller/config/PopPackages";
import PopAllotedAreas from "@/pages/reseller/config/PopAllotedAreas";
import PopDevicesConfig from "@/pages/reseller/config/PopDevices";
// POP-scoped Employee
import PopEmployees from "@/pages/reseller/employee/PopEmployees";
import PopAddEmployee from "@/pages/reseller/employee/PopAddEmployee";
// POP-scoped Client
// PopClientList removed — /pop-admin/clients now reuses dashboard ClientList (POP-scoped via usePopScope)
import PopAddClient from "@/pages/reseller/clients/PopAddClient";
import PopBillingClient from "@/pages/reseller/clients/PopBillingClient";
import PopLeftClients from "@/pages/reseller/clients/PopLeftClients";
import PopScheduler from "@/pages/reseller/clients/PopScheduler";
import PopPlaceholder from "@/pages/reseller/PopPlaceholder";
import PopOnlineMonitoring from "@/pages/reseller/PopOnlineMonitoring";
import PopFundDebitHistory from "@/pages/reseller/PopFundDebitHistory";
// POP Reports
import PopBillCollection from "@/pages/reseller/reports/PopBillCollection";
import PopReportCustomer from "@/pages/reseller/reports/PopCustomer";
import PopReportMessages from "@/pages/reseller/reports/PopMessages";
import PopReportDueSms from "@/pages/reseller/reports/PopDueSms";
import PopReportProcessingFee from "@/pages/reseller/reports/PopProcessingFee";
import PopReportDiscount from "@/pages/reseller/reports/PopDiscount";
import PopReportBtrc from "@/pages/reseller/reports/PopBtrc";
import PopReportFinancial from "@/pages/reseller/reports/PopFinancial";
import PopReportEnableDisable from "@/pages/reseller/reports/PopEnableDisable";
import PopFundCreditHistory from "@/pages/reseller/PopFundCreditHistory";
import PopSetup from "@/pages/reseller/system/PopSetup";
import PopBillPeriod from "@/pages/reseller/system/PopBillPeriod";
import PopPeriodSetup from "@/pages/reseller/system/PopPeriodSetup";
import PopInvoice from "@/pages/reseller/system/PopInvoice";
import PopEmail from "@/pages/reseller/system/PopEmail";
import PopPaymentGateways from "@/pages/reseller/system/PopPaymentGateways";
import PopProcessingFee from "@/pages/reseller/system/PopProcessingFee";
import PopAutomaticProcess from "@/pages/reseller/system/PopAutomaticProcess";
import PopActivityLog from "@/pages/reseller/system/PopActivityLog";
import PopIncome from "@/pages/reseller/accounting/PopIncome";
import PopExpense from "@/pages/reseller/accounting/PopExpense";
import PopCashBook from "@/pages/reseller/accounting/PopCashBook";
import PopEditEmployee from "@/pages/reseller/employee/PopEditEmployee";
import PopSalarySheet from "@/pages/reseller/employee/PopSalarySheet";
import PopDesignations from "@/pages/reseller/config/PopDesignations";
import PopBulkClientImport from "@/pages/reseller/clients/PopBulkClientImport";
import BulkClientImportHub from "@/pages/reseller/clients/BulkClientImportHub";

// Bandwidth Customer Portal
import BwProtectedRoute from "@/components/BwProtectedRoute";
import BwCustomerLayout from "@/components/BwCustomerLayout";
import BwDashboard from "@/pages/bw-customer/BwDashboard";
import BwInvoices from "@/pages/bw-customer/BwInvoices";
import BwPurchaseOrders from "@/pages/bw-customer/BwPurchaseOrders";
import BwTickets from "@/pages/bw-customer/BwTickets";
import BwSettings from "@/pages/bw-customer/BwSettings";

// Redirect helper: any /reseller/<rest> → /pop-admin/<rest>
const LegacyResellerRedirect = () => {
  const path = window.location.pathname.replace(/^\/reseller/, "/pop-admin");
  return <Navigate to={path + window.location.search + window.location.hash} replace />;
};

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onMutate: (_vars, mutation) => {
      if ((mutation.options.meta as any)?.silent) return;
      const msg = (mutation.options.meta as any)?.loadingMessage as string | undefined;
      useGlobalLoading.getState().start(msg);
    },
    onSettled: (_d, _e, _v, _c, mutation) => {
      if ((mutation.options.meta as any)?.silent) return;
      useGlobalLoading.getState().stop();
    },
  }),
});

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
);

const Pub = ({ children }: { children: React.ReactNode }) => (
  <PublicLayout>{children}</PublicLayout>
);

const App = () => (
  <ThemeProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalLoadingOverlay />
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
              <Route path="/shop" element={<Pub><Shop /></Pub>} />
              <Route path="/shop/:slug" element={<Pub><ShopProduct /></Pub>} />
              <Route path="/cart" element={<Pub><Cart /></Pub>} />
              <Route path="/checkout" element={<PortalAuthProvider><Pub><Checkout /></Pub></PortalAuthProvider>} />
              <Route path="/order/:id/track" element={<Pub><OrderTrack /></Pub>} />
              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<P><Dashboard /></P>} />
              <Route path="/dashboard/links" element={<P><DashboardLinks /></P>} />
              <Route path="/dashboard/billing-overview" element={<P><CompanyOverview /></P>} />
              <Route path="/dashboard/olt-overview" element={<P><OltOverview /></P>} />
              <Route path="/dashboard/_icons" element={<P><IconPreview /></P>} />

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
              <Route path="/dashboard/config/locations" element={<P><ConfigLocations /></P>} />

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
              <Route path="/dashboard/clients/update-requests" element={<P><UserUpdateRequests /></P>} />

              {/* Billing */}
              <Route path="/dashboard/billing" element={<P><BillingList /></P>} />
              <Route path="/dashboard/billing/client/:id" element={<P><ClientProfile /></P>} />
              <Route path="/dashboard/billing/daily-collection" element={<P><BillingDailyCollection /></P>} />
              <Route path="/dashboard/billing/cycle-settings" element={<P><BillingCycleSettings /></P>} />

              {/* Mikrotik */}
              <Route path="/dashboard/mikrotik/servers" element={<P><MikrotikServers /></P>} />
              <Route path="/dashboard/mikrotik/backup" element={<P><MikrotikBackup /></P>} />
              <Route path="/dashboard/mikrotik/import" element={<P><MikrotikImport /></P>} />
              <Route path="/dashboard/mikrotik/bulk-import" element={<P><MikrotikBulkImport /></P>} />

              {/* Device Administration */}
              <Route path="/dashboard/device-admin" element={<P><DeviceAdminDashboard /></P>} />
              <Route path="/dashboard/device-admin/devices" element={<P><DeviceAdminDevices /></P>} />
              <Route path="/dashboard/device-admin/users" element={<P><DeviceAdminAllUsers /></P>} />
              <Route path="/dashboard/device-admin/groups" element={<P><DeviceAdminGroups /></P>} />
              <Route path="/dashboard/device-admin/backups" element={<P><DeviceAdminBackups /></P>} />
              <Route path="/dashboard/device-admin/schedules" element={<P><DeviceAdminSchedules /></P>} />
              <Route path="/dashboard/device-admin/jobs" element={<P><DeviceAdminJobs /></P>} />
              <Route path="/dashboard/device-admin/audit-log" element={<P><DeviceAdminAuditLog /></P>} />

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
              <Route path="/dashboard/olt/power-dashboard" element={<P><PowerDashboard /></P>} />
              <Route path="/dashboard/olt/onu" element={<P><OnuList /></P>} />
              <Route path="/dashboard/olt/onu/:id" element={<P><OnuDetail /></P>} />
              <Route path="/dashboard/olt/users" element={<P><OltUsers /></P>} />
              <Route path="/dashboard/olt/ports" element={<P><OltPorts /></P>} />
              <Route path="/dashboard/olt/user-down" element={<P><UserDownCount /></P>} />
              <Route path="/dashboard/olt/fiber-down" element={<P><FiberDownFinder /></P>} />
              <Route path="/dashboard/olt/sharing" element={<P><OltSharing /></P>} />

              {/* Network — Switches */}
              <Route path="/dashboard/network/switches" element={<P><NetworkSwitchList /></P>} />
              <Route path="/dashboard/network/switches/:id" element={<P><NetworkSwitchDetail /></P>} />

              {/* Network Monitoring */}
              <Route path="/dashboard/monitoring/online" element={<P><OnlineClientMonitoring /></P>} />
              <Route path="/dashboard/monitoring/live-traffic" element={<P><LiveTraffic /></P>} />
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
              <Route path="/dashboard/branches/edit-manager/:id" element={<P><BranchEditManager /></P>} />
              <Route path="/dashboard/branches/managers" element={<P><BranchManagers /></P>} />
              <Route path="/dashboard/branches/pop/:id" element={<P><PopProfile /></P>} />
              <Route path="/dashboard/branches/funding" element={<P><BranchFunding /></P>} />
              <Route path="/dashboard/branches/funding-history" element={<P><BranchFundingHistory /></P>} />
              <Route path="/dashboard/branches/pgw-transactions" element={<P><BranchPgwTransactions /></P>} />
              <Route path="/dashboard/branches/pgw-payments" element={<Navigate to="/dashboard/branches/pgw-transactions" replace />} />
              <Route path="/dashboard/branches/pgw-settlement" element={<Navigate to="/dashboard/branches/pgw-transactions" replace />} />
              <Route path="/dashboard/branches/pop-notice" element={<Navigate to="/dashboard/support/notices" replace />} />

              {/* Events */}
              <Route path="/dashboard/events" element={<P><Events /></P>} />

              {/* Support */}
              <Route path="/dashboard/support/categories" element={<P><SupportCategories /></P>} />
              <Route path="/dashboard/support/tickets" element={<P><SupportTickets /></P>} />
              <Route path="/dashboard/support/history" element={<P><SupportHistory /></P>} />
              <Route path="/dashboard/support/notices" element={<P><SupportNotices /></P>} />

              {/* Tasks */}
              <Route path="/dashboard/tasks/categories" element={<P><TaskCategories /></P>} />
              <Route path="/dashboard/tasks" element={<P><Tasks /></P>} />
              <Route path="/dashboard/tasks/history" element={<P><TaskHistory /></P>} />

              {/* BW Buy */}
              <Route path="/dashboard/bw-buy/items" element={<P><BwBuyItems /></P>} />
              <Route path="/dashboard/bw-buy/categories" element={<P><BwBuyCategories /></P>} />
              <Route path="/dashboard/bw-buy/providers" element={<P><BwBuyProviders /></P>} />
              <Route path="/dashboard/bw-buy/subscriptions" element={<P><BwBuySubscriptions /></P>} />
              <Route path="/dashboard/bw-buy/bills" element={<P><BwBuyBills /></P>} />
              <Route path="/dashboard/bw-buy/bills/new" element={<P><BwBuyBillForm /></P>} />
              <Route path="/dashboard/bw-buy/bills/:id" element={<P><BwBuyBillView /></P>} />
              <Route path="/dashboard/bw-buy/bills/:id/edit" element={<P><BwBuyBillForm /></P>} />

              {/* BW Sale */}
              <Route path="/dashboard/bw-sale/pop" element={<P><BwSalePop /></P>} />
              <Route path="/dashboard/bw-sale/pop/:id" element={<P><BwSaleCustomerView /></P>} />
              <Route path="/dashboard/bw-sale/services" element={<P><BwSaleServices /></P>} />
              <Route path="/dashboard/bw-sale/invoices" element={<P><BwSaleInvoices /></P>} />
              <Route path="/dashboard/bw-sale/invoices/new" element={<P><BwSaleInvoiceForm /></P>} />
              <Route path="/dashboard/bw-sale/invoices/:id" element={<P><BwSaleInvoiceDetail /></P>} />
              <Route path="/dashboard/bw-sale/invoices/:id/edit" element={<P><BwSaleInvoiceForm /></P>} />
              <Route path="/dashboard/bw-sale/collection" element={<P><BwSaleCollection /></P>} />
              <Route path="/dashboard/bw-sale/recurring" element={<P><BwSaleRecurring /></P>} />
              <Route path="/dashboard/bw-sale/recurring/new" element={<P><BwSaleRecurringForm /></P>} />
              <Route path="/dashboard/bw-sale/recurring/:id/edit" element={<P><BwSaleRecurringForm /></P>} />

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
              <Route path="/dashboard/sms/telegram" element={<P><TelegramSetup /></P>} />

              {/* System */}
              <Route path="/dashboard/notes" element={<P><AdminNotes /></P>} />
              <Route path="/dashboard/system/company" element={<P><SystemCompany /></P>} />
              <Route path="/dashboard/system/invoice" element={<P><SystemInvoice /></P>} />
              <Route path="/dashboard/system/periods" element={<P><SystemPeriods /></P>} />
              <Route path="/dashboard/system/payment-gateways" element={<P><SystemPaymentGateways /></P>} />
              <Route path="/dashboard/system/email" element={<P><SystemEmail /></P>} />
              <Route path="/dashboard/system/setup" element={<P><SystemSetup /></P>} />
              <Route path="/dashboard/system/processing-fee" element={<P><SystemProcessingFee /></P>} />
              <Route path="/dashboard/system/system-log" element={<P><SystemLog /></P>} />
              <Route path="/dashboard/system/bill-period-years" element={<P><SystemBillPeriodYears /></P>} />
              <Route path="/dashboard/system/automatic-process" element={<P><SystemAutomaticProcess /></P>} />
              {/* Removed: users, roles, olt-permissions, device-permissions */}
              <Route path="/dashboard/system/users" element={<Navigate to="/dashboard/system/setup" replace />} />
              <Route path="/dashboard/system/users/:id" element={<Navigate to="/dashboard/system/setup" replace />} />
              <Route path="/dashboard/system/roles" element={<Navigate to="/dashboard/system/setup" replace />} />
              <Route path="/dashboard/system/olt-permissions" element={<Navigate to="/dashboard/system/setup" replace />} />
              <Route path="/dashboard/system/device-permissions" element={<Navigate to="/dashboard/system/setup" replace />} />

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

              {/* E-Commerce Shop */}
              <Route path="/dashboard/shop/categories" element={<P><ShopCategories /></P>} />
              <Route path="/dashboard/shop/products" element={<P><ShopProducts /></P>} />
              <Route path="/dashboard/shop/products/new" element={<P><ShopProductForm /></P>} />
              <Route path="/dashboard/shop/products/:id" element={<P><ShopProductForm /></P>} />
              <Route path="/dashboard/shop/orders" element={<P><ShopOrders /></P>} />
              <Route path="/dashboard/shop/orders/new" element={<P><AdminCreateOrder /></P>} />
              <Route path="/dashboard/shop/orders/:id" element={<P><ShopOrderDetail /></P>} />
              <Route path="/dashboard/shop/shipping" element={<P><ShopShippingZones /></P>} />
              <Route path="/dashboard/shop/coupons" element={<P><ShopCoupons /></P>} />
              <Route path="/dashboard/shop/warranty" element={<P><WarrantyClaims /></P>} />
              <Route path="/dashboard/shop/reports" element={<P><ShopSalesReport /></P>} />

              {/* Portal */}
              <Route path="/portal/login" element={<PortalAuthProvider><PortalLogin /></PortalAuthProvider>} />
              <Route path="/portal/dashboard" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalDashboard /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/invoices" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalInvoices /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/bills" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalBills /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/bills/:id" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalBillInvoice /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              
              <Route path="/portal/support" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalSupport /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/notices" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalNotices /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/company" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalCompanyInfo /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/media" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalMediaServers /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/ledger" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalLedger /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/live-usage" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalLiveUsage /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/speed-test" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalSpeedTest /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/shop" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalShop /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/checkout" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalShopCheckout /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/my-orders" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalMyOrders /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/profile" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalProfile /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/messages" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalMessages /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />
              <Route path="/portal/change-request" element={<PortalAuthProvider><PortalProtectedRoute><PortalLayout><PortalChangeRequest /></PortalLayout></PortalProtectedRoute></PortalAuthProvider>} />

              {/* Bandwidth Customer Portal (5 mandatory pages + upgrade) */}
              <Route path="/bw" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw/dashboard" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwDashboard /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/invoices" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwInvoices /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/purchase-orders" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwPurchaseOrders /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/tickets" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwTickets /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/settings" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwSettings /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />

              {/* POP Admin Portal */}
              <Route path="/pop-admin" element={<Navigate to="/pop-admin/dashboard" replace />} />
              <Route path="/pop-admin/login" element={<Navigate to="/login" replace />} />
              <Route path="/pop-admin/dashboard" element={<PortalAuthProvider><ResellerProtectedRoute require="dashboard"><ResellerLayout><ResellerDashboard /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/invoices" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerLayout><ResellerInvoices /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/invoices/:id" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerLayout><ResellerInvoiceDetail /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/invoices/:id/print" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerInvoicePrint /></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/tickets" element={<PortalAuthProvider><ResellerProtectedRoute require="tickets"><ResellerLayout><ResellerTickets /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/users" element={<PortalAuthProvider><ResellerProtectedRoute require="users"><ResellerLayout><ResellerUsers /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/settings" element={<PortalAuthProvider><ResellerProtectedRoute require="settings"><ResellerLayout><ResellerSettings /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/notes" element={<PortalAuthProvider><ResellerProtectedRoute require="dashboard"><ResellerLayout><PopNotes /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/mikrotik-users" element={<PortalAuthProvider><ResellerProtectedRoute require="dashboard"><ResellerLayout><ResellerMikrotikUsers /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/mikrotik-users/bulk-create" element={<PortalAuthProvider><ResellerProtectedRoute require="dashboard"><ResellerLayout><BulkClientImportHub /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              {/* POP Admin — Configuration (reuses Admin pages, scoped via usePopScope) */}
              <Route path="/pop-admin/config/zones" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ConfigZones /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/sub-zones" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ConfigSubZones /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/boxes" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ConfigBoxes /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/packages" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopPackages /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/districts" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopAllotedAreas mode="district" /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/upazilas" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopAllotedAreas mode="upazila" /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/departments" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><HrDepartments /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/designations" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopDesignations /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/config/devices" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopDevicesConfig /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              {/* POP Admin — Employee */}
              <Route path="/pop-admin/employees" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopEmployees /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/employees/add" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopAddEmployee /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/employees/salary-sheet" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopSalarySheet /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              {/* POP Admin — Client (reuses Admin pages, auto-scoped via usePopScope) */}
              <Route path="/pop-admin/clients" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ClientList /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/clients/add" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ClientAdd /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/clients/bulk-import" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><BulkClientImportHub /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/clients/billing" element={<Navigate to="/pop-admin/billing/list" replace />} />
              <Route path="/pop-admin/clients/left" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ClientLeft /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/clients/scheduler" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ClientScheduler /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              {/* POP Admin — Billing (reuses Admin pages, scoped via usePopScope) */}
              <Route path="/pop-admin/billing/list" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><BillingList /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/billing/daily-collection" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><BillingDailyCollection /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/billing/client/:id" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><ClientProfile /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/billing/invoice" element={<Navigate to="/pop-admin/billing/list" replace />} />
              <Route path="/pop-admin/billing/profile" element={<Navigate to="/pop-admin/clients/billing" replace />} />
              <Route path="/pop-admin/monitoring/online" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopOnlineMonitoring /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/monitoring/ping" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopPlaceholder title="Ping Tools" /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/sms/templates" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopSmsTemplates /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/sms/individual" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopSmsIndividual /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/sms/send" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopSmsSend /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/sms/gateway" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopSmsGateway /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/sms/telegram" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopTelegramSetup /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/bill-collection" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopBillCollection /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/customer" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportCustomer /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/enable-disable" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportEnableDisable /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/messages" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportMessages /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/processing-fee" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportProcessingFee /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/discount" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportDiscount /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/due-sms" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportDueSms /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/btrc" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportBtrc /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/reports/financial" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopReportFinancial /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/setup" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopSetup /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/bill-period" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopBillPeriod /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/period" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopPeriodSetup /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/invoice" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopInvoice /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/email" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopEmail /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/payment-gateways" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopPaymentGateways /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/processing-fee" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopProcessingFee /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/automatic-process" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopAutomaticProcess /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/system/activity-log" element={<PortalAuthProvider><ResellerProtectedRoute require="system"><ResellerLayout><PopActivityLog /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              {/* POP Admin — Accounting */}
              <Route path="/pop-admin/accounting/income" element={<PortalAuthProvider><ResellerProtectedRoute require="accounting"><ResellerLayout><PopIncome /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/accounting/expense" element={<PortalAuthProvider><ResellerProtectedRoute require="accounting"><ResellerLayout><PopExpense /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/accounting/cashbook" element={<PortalAuthProvider><ResellerProtectedRoute require="accounting"><ResellerLayout><PopCashBook /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/employees/edit/:id" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopEditEmployee /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/fund-history/credit" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopFundCreditHistory /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/fund-history/debit" element={<PortalAuthProvider><ResellerProtectedRoute><ResellerLayout><PopFundDebitHistory /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />

              {/* Legacy /reseller/* → /pop-admin/* redirects */}
              <Route path="/reseller" element={<Navigate to="/pop-admin/dashboard" replace />} />
              <Route path="/reseller/login" element={<Navigate to="/login" replace />} />
              <Route path="/reseller/*" element={<LegacyResellerRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
