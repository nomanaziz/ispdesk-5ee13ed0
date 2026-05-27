import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GlobalLoadingOverlay } from "@/components/GlobalLoadingOverlay";
import { BootGate } from "@/components/BootGate";
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
const Home = lazy(() => import("@/pages/public/Home"));
const Packages = lazy(() => import("@/pages/public/Packages"));
const Coverage = lazy(() => import("@/pages/public/Coverage"));
const NewConnection = lazy(() => import("@/pages/public/NewConnection"));
const QuickPay = lazy(() => import("@/pages/public/QuickPay"));
const Services = lazy(() => import("@/pages/public/Services"));
const About = lazy(() => import("@/pages/public/About"));
const Contact = lazy(() => import("@/pages/public/Contact"));
const Offers = lazy(() => import("@/pages/public/Offers"));
const Shop = lazy(() => import("@/pages/public/Shop"));
const ShopProduct = lazy(() => import("@/pages/public/ShopProduct"));
const Cart = lazy(() => import("@/pages/public/Cart"));
const Checkout = lazy(() => import("@/pages/public/Checkout"));
const OrderTrack = lazy(() => import("@/pages/public/OrderTrack"));

// Shop Admin
const ShopCategories = lazy(() => import("@/pages/dashboard/shop/Categories"));
const ShopProducts = lazy(() => import("@/pages/dashboard/shop/Products"));
const ShopProductForm = lazy(() => import("@/pages/dashboard/shop/ProductForm"));
const ShopOrders = lazy(() => import("@/pages/dashboard/shop/Orders"));
const ShopOrderDetail = lazy(() => import("@/pages/dashboard/shop/OrderDetail"));
const ShopShippingZones = lazy(() => import("@/pages/dashboard/shop/ShippingZones"));
const ShopCoupons = lazy(() => import("@/pages/dashboard/shop/Coupons"));
const WarrantyClaims = lazy(() => import("@/pages/dashboard/shop/WarrantyClaims"));
const ShopSalesReport = lazy(() => import("@/pages/dashboard/shop/SalesReport"));
const AdminCreateOrder = lazy(() => import("@/pages/dashboard/shop/AdminCreateOrder"));

// Auth pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Dashboard pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CompanyOverview = lazy(() => import("./pages/dashboard/CompanyOverview"));
const OltOverview = lazy(() => import("./pages/dashboard/OltOverview"));
const IconPreview = lazy(() => import("./pages/dashboard/dev/IconPreview"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Config
const ConfigZones = lazy(() => import("@/pages/dashboard/config/Zones"));
const ConfigSubZones = lazy(() => import("@/pages/dashboard/config/SubZones"));
const ConfigBoxes = lazy(() => import("@/pages/dashboard/config/Boxes"));
const ConfigConnectionTypes = lazy(() => import("@/pages/dashboard/config/ConnectionTypes"));
const ConfigClientTypes = lazy(() => import("@/pages/dashboard/config/ClientTypes"));
const ConfigProtocolTypes = lazy(() => import("@/pages/dashboard/config/ProtocolTypes"));
const ConfigBillingStatuses = lazy(() => import("@/pages/dashboard/config/BillingStatuses"));
const ConfigPackages = lazy(() => import("@/pages/dashboard/config/Packages"));
const ConfigDivisions = lazy(() => import("@/pages/dashboard/config/Divisions"));
const ConfigDistricts = lazy(() => import("@/pages/dashboard/config/Districts"));
const ConfigUpazilas = lazy(() => import("@/pages/dashboard/config/Upazilas"));
const ConfigLocations = lazy(() => import("@/pages/dashboard/config/Locations"));

// VAS
const VasConfig = lazy(() => import("@/pages/dashboard/vas/VasConfig"));
const VasTransactions = lazy(() => import("@/pages/dashboard/vas/VasTransactions"));
const VasSubscriptions = lazy(() => import("@/pages/dashboard/vas/VasSubscriptions"));

// Client
const ClientNewRequest = lazy(() => import("@/pages/dashboard/clients/NewRequest"));
const ClientAdd = lazy(() => import("@/pages/dashboard/clients/AddClient"));
const ClientList = lazy(() => import("@/pages/dashboard/clients/ClientList"));
const HomeClients = lazy(() => import("@/pages/dashboard/clients/HomeClients"));
const CorporateClients = lazy(() => import("@/pages/dashboard/clients/CorporateClients"));
const ClientLeft = lazy(() => import("@/pages/dashboard/clients/LeftClients"));
const ClientScheduler = lazy(() => import("@/pages/dashboard/clients/Scheduler"));
const ClientChangeRequest = lazy(() => import("@/pages/dashboard/clients/ChangeRequest"));
const ClientPortalManage = lazy(() => import("@/pages/dashboard/clients/PortalManage"));

// Billing
const BillingList = lazy(() => import("@/pages/dashboard/billing/BillingList"));
const BillingDailyCollection = lazy(() => import("@/pages/dashboard/billing/DailyCollection"));
const ClientProfile = lazy(() => import("@/pages/dashboard/billing/ClientProfile"));
const BillingCycleSettings = lazy(() => import("@/pages/dashboard/billing/BillingCycleSettings"));

// Mikrotik
const MikrotikServers = lazy(() => import("@/pages/dashboard/mikrotik/Servers"));
const MikrotikBackup = lazy(() => import("@/pages/dashboard/mikrotik/Backup"));
const MikrotikImport = lazy(() => import("@/pages/dashboard/mikrotik/Import"));
const MikrotikBulkImport = lazy(() => import("@/pages/dashboard/mikrotik/BulkImport"));

// Device Administration
const DeviceAdminDashboard = lazy(() => import("@/pages/dashboard/device-admin/Dashboard"));
const DeviceAdminDevices = lazy(() => import("@/pages/dashboard/device-admin/Devices"));
const DeviceAdminAllUsers = lazy(() => import("@/pages/dashboard/device-admin/AllDeviceUsers"));
const DeviceAdminGroups = lazy(() => import("@/pages/dashboard/device-admin/Groups"));
const DeviceAdminBackups = lazy(() => import("@/pages/dashboard/device-admin/Backups"));
const DeviceAdminSchedules = lazy(() => import("@/pages/dashboard/device-admin/Schedules"));
const DeviceAdminAuditLog = lazy(() => import("@/pages/dashboard/device-admin/AuditLog"));
const DeviceAdminJobs = lazy(() => import("@/pages/dashboard/device-admin/Jobs"));
const DeviceAdminOidLibrary = lazy(() => import("@/pages/dashboard/device-admin/OidLibrary"));
const DeviceAdminPollingAgents = lazy(() => import("@/pages/dashboard/device-admin/PollingAgents"));

// HR
const HrDepartments = lazy(() => import("@/pages/dashboard/hr/Departments"));
const HrPayheads = lazy(() => import("@/pages/dashboard/hr/Payheads"));
const HrPayroll = lazy(() => import("@/pages/dashboard/hr/Payroll"));
const HrPositions = lazy(() => import("@/pages/dashboard/hr/Positions"));
const HrPayslip = lazy(() => import("@/pages/dashboard/hr/Payslip"));
const HrPayslipPrint = lazy(() => import("@/pages/dashboard/hr/PayslipPrint"));
const HrAddEmployee = lazy(() => import("@/pages/dashboard/hr/AddEmployee"));
const HrEmployees = lazy(() => import("@/pages/dashboard/hr/Employees"));
const HrEmployeeView = lazy(() => import("@/pages/dashboard/hr/EmployeeView"));
const HrSalarySheet = lazy(() => import("@/pages/dashboard/hr/SalarySheet"));
const HrResignRules = lazy(() => import("@/pages/dashboard/hr/ResignRules"));
const HrResignations = lazy(() => import("@/pages/dashboard/hr/Resignations"));
const HrRejoin = lazy(() => import("@/pages/dashboard/hr/Rejoin"));
const HrAttendance = lazy(() => import("@/pages/dashboard/hr/Attendance"));
const HrShiftManagement = lazy(() => import("@/pages/dashboard/hr/ShiftManagement"));
const HrZktecoDevices = lazy(() => import("@/pages/dashboard/hr/ZktecoDevices"));
const HrAttendanceRules = lazy(() => import("@/pages/dashboard/hr/AttendanceRules"));
const HrSettings = lazy(() => import("@/pages/dashboard/hr/HrSettings"));
const HrAttendanceReport = lazy(() => import("@/pages/dashboard/hr/AttendanceReport"));
const HrGeoPunch = lazy(() => import("@/pages/dashboard/hr/GeoPunch"));
const HrAdvanceSalary = lazy(() => import("@/pages/dashboard/hr/AdvanceSalary"));
const HrEmployeeLoans = lazy(() => import("@/pages/dashboard/hr/EmployeeLoans"));
const HrFacilityPolicies = lazy(() => import("@/pages/dashboard/hr/FacilityPolicies"));
const HrConveyanceBills = lazy(() => import("@/pages/dashboard/hr/ConveyanceBills"));
const HrMyConveyance = lazy(() => import("@/pages/dashboard/hr/MyConveyance"));
const DashboardLinks = lazy(() => import("@/pages/dashboard/Links"));

// Access Management
const AppUsers = lazy(() => import("@/pages/dashboard/access/AppUsers"));
const AppRoles = lazy(() => import("@/pages/dashboard/access/AppRoles"));

// OLT
const OltDevices = lazy(() => import("@/pages/dashboard/olt/OltDevices"));
const OltUsers = lazy(() => import("@/pages/dashboard/olt/OltUsers"));
const OltPorts = lazy(() => import("@/pages/dashboard/olt/OltPorts"));
const OnuList = lazy(() => import("@/pages/dashboard/olt/OnuList"));
const OnuDetail = lazy(() => import("@/pages/dashboard/olt/OnuDetail"));
const PowerDashboard = lazy(() => import("@/pages/dashboard/olt/PowerDashboard"));
const OnlineMonitoring = lazy(() => import("@/pages/dashboard/olt/OnlineMonitoring"));
const UserDownCount = lazy(() => import("@/pages/dashboard/olt/UserDownCount"));
const FiberDownFinder = lazy(() => import("@/pages/dashboard/olt/FiberDownFinder"));
const OltSharing = lazy(() => import("@/pages/dashboard/olt/OltSharing"));
// OLT Mobile (NexOLT-style)
const MOltList = lazy(() => import("@/pages/olt-mobile/OltList"));
const MOltOverview = lazy(() => import("@/pages/olt-mobile/OltOverview"));
const MOltOnuList = lazy(() => import("@/pages/olt-mobile/OltOnuList"));
const MOltMore = lazy(() => import("@/pages/olt-mobile/OltMore"));
const MOpticalCalc = lazy(() => import("@/pages/olt-mobile/OpticalCalculator"));

const NetworkSwitchList = lazy(() => import("@/pages/dashboard/network/SwitchList"));
const NetworkSwitchDetail = lazy(() => import("@/pages/dashboard/network/SwitchDetail"));

// Network Monitoring
const SwitchList = lazy(() => import("@/pages/dashboard/monitoring/SwitchList"));
const AddSwitch = lazy(() => import("@/pages/dashboard/monitoring/AddSwitch"));
const PopDass = lazy(() => import("@/pages/dashboard/monitoring/PopDass"));
const PopIp = lazy(() => import("@/pages/dashboard/monitoring/PopIp"));
const PopLog = lazy(() => import("@/pages/dashboard/monitoring/PopLog"));
const PingTools = lazy(() => import("@/pages/dashboard/monitoring/PingTools"));
const PopDevices = lazy(() => import("@/pages/dashboard/monitoring/PopDevices"));
const OnlineClientMonitoring = lazy(() => import("@/pages/dashboard/monitoring/OnlineClientMonitoring"));
const LiveTraffic = lazy(() => import("@/pages/dashboard/monitoring/LiveTraffic"));
const TopUsers = lazy(() => import("@/pages/dashboard/monitoring/TopUsers"));

// Network
const NetworkDiagram = lazy(() => import("@/pages/dashboard/network/Diagram"));
const NetworkPop = lazy(() => import("@/pages/dashboard/network/Pop"));
const NetworkClients = lazy(() => import("@/pages/dashboard/network/NetworkClients"));
const NetworkConnections = lazy(() => import("@/pages/dashboard/network/Connections"));
const NetworkDistributedItems = lazy(() => import("@/pages/dashboard/network/DistributedItems"));
const NetworkMap = lazy(() => import("@/pages/dashboard/network/Map"));

// Leave (unified under HR)
const LeaveManagement = lazy(() => import("@/pages/dashboard/hr/LeaveManagement"));

// Branch
const BranchTariff = lazy(() => import("@/pages/dashboard/branches/Tariff"));
const BranchAddManager = lazy(() => import("@/pages/dashboard/branches/AddManager"));
const BranchEditManager = lazy(() => import("@/pages/dashboard/branches/EditManager"));
const BranchManagers = lazy(() => import("@/pages/dashboard/branches/Managers"));
const PopProfile = lazy(() => import("@/pages/dashboard/branches/PopProfile"));
const BranchFunding = lazy(() => import("@/pages/dashboard/branches/Funding"));
const BranchFundingHistory = lazy(() => import("@/pages/dashboard/branches/FundingHistory"));
const BranchPgwTransactions = lazy(() => import("@/pages/dashboard/branches/PgwTransactions"));


// Events
const Events = lazy(() => import("@/pages/dashboard/events/Events"));

// Support
const SupportCategories = lazy(() => import("@/pages/dashboard/support/SupportCategories"));
const SupportTickets = lazy(() => import("@/pages/dashboard/support/Tickets"));
const SupportHistory = lazy(() => import("@/pages/dashboard/support/History"));
const SupportNotices = lazy(() => import("@/pages/dashboard/support/Notices"));

// Tasks
const TaskCategories = lazy(() => import("@/pages/dashboard/tasks/TaskCategories"));
const Tasks = lazy(() => import("@/pages/dashboard/tasks/Tasks"));
const TaskHistory = lazy(() => import("@/pages/dashboard/tasks/TaskHistory"));

// BW Buy
const BwBuyItems = lazy(() => import("@/pages/dashboard/bw-buy/Items"));
const BwBuyCategories = lazy(() => import("@/pages/dashboard/bw-buy/Categories"));
const BwBuyProviders = lazy(() => import("@/pages/dashboard/bw-buy/Providers"));
const BwBuyBills = lazy(() => import("@/pages/dashboard/bw-buy/Bills"));
const BwBuyBillForm = lazy(() => import("@/pages/dashboard/bw-buy/BillForm"));
const BwBuyBillView = lazy(() => import("@/pages/dashboard/bw-buy/BillView"));
const BwBuySubscriptions = lazy(() => import("@/pages/dashboard/bw-buy/Subscriptions"));

// BW Sale
const BwSalePop = lazy(() => import("@/pages/dashboard/bw-sale/Pop"));
const BwSaleInvoices = lazy(() => import("@/pages/dashboard/bw-sale/Invoices"));
const BwSaleInvoiceForm = lazy(() => import("@/pages/dashboard/bw-sale/InvoiceForm"));
const BwSaleInvoiceDetail = lazy(() => import("@/pages/dashboard/bw-sale/InvoiceDetail"));
const BwSaleCollection = lazy(() => import("@/pages/dashboard/bw-sale/Collection"));
const BwSaleRecurring = lazy(() => import("@/pages/dashboard/bw-sale/Recurring"));
const BwSaleCustomerView = lazy(() => import("@/pages/dashboard/bw-sale/CustomerView"));
const BwSaleServices = lazy(() => import("@/pages/dashboard/bw-sale/Services"));
const BwSaleRecurringForm = lazy(() => import("@/pages/dashboard/bw-sale/RecurringForm"));
const BwSalePanelPricing = lazy(() => import("@/pages/dashboard/bw-sale/PanelPricing"));

// Purchase
const PurchaseVendors = lazy(() => import("@/pages/dashboard/purchases/Vendors"));
const PurchaseRequisitions = lazy(() => import("@/pages/dashboard/purchases/Requisitions"));
const PurchaseList = lazy(() => import("@/pages/dashboard/purchases/Purchases"));
const PurchaseBills = lazy(() => import("@/pages/dashboard/purchases/PurchaseBills"));

// Sales & Service
const SalesProductInvoice = lazy(() => import("@/pages/dashboard/sales/ProductInvoice"));
const SalesServiceInvoice = lazy(() => import("@/pages/dashboard/sales/ServiceInvoice"));
const SalesInstallationFee = lazy(() => import("@/pages/dashboard/sales/InstallationFee"));

// Inventory
const InventoryUnits = lazy(() => import("@/pages/dashboard/inventory/Units"));
const InventoryLocations = lazy(() => import("@/pages/dashboard/inventory/Locations"));
const InventoryCategories = lazy(() => import("@/pages/dashboard/inventory/InventoryCategories"));
const InventoryItems = lazy(() => import("@/pages/dashboard/inventory/InventoryItems"));
const InventoryStock = lazy(() => import("@/pages/dashboard/inventory/Stock"));

// Assets
const AssetList = lazy(() => import("@/pages/dashboard/assets/AssetList"));
const AssetDestroyed = lazy(() => import("@/pages/dashboard/assets/Destroyed"));

// Accounting
const AccountingDashboard = lazy(() => import("@/pages/dashboard/accounting/AccountingDashboard"));
const AccountingChart = lazy(() => import("@/pages/dashboard/accounting/ChartOfAccounts"));
const AccountingIncome = lazy(() => import("@/pages/dashboard/accounting/Income"));
const AccountingExpense = lazy(() => import("@/pages/dashboard/accounting/Expense"));
const AccountingJournal = lazy(() => import("@/pages/dashboard/accounting/Journal"));
const AccountingTransactions = lazy(() => import("@/pages/dashboard/accounting/Transactions"));
const AccountingBalances = lazy(() => import("@/pages/dashboard/accounting/Balances"));
const AccountingBalanceSheet = lazy(() => import("@/pages/dashboard/accounting/BalanceSheet"));
const AccountingProfitLoss = lazy(() => import("@/pages/dashboard/accounting/ProfitLoss"));
const AccountingComparePL = lazy(() => import("@/pages/dashboard/accounting/ComparePL"));
const AccountingTrialBalance = lazy(() => import("@/pages/dashboard/accounting/TrialBalance"));
const AccountingCashBook = lazy(() => import("@/pages/dashboard/accounting/CashBook"));

// Reports
const ReportBillCollection = lazy(() => import("@/pages/dashboard/reports/BillCollection"));
const ReportDiscount = lazy(() => import("@/pages/dashboard/reports/Discount"));
const ReportCustomer = lazy(() => import("@/pages/dashboard/reports/Customer"));
const ReportMessages = lazy(() => import("@/pages/dashboard/reports/Messages"));
const ReportDueSms = lazy(() => import("@/pages/dashboard/reports/DueSms"));
const ReportProcessingFee = lazy(() => import("@/pages/dashboard/reports/ProcessingFee"));
const ReportBtrc = lazy(() => import("@/pages/dashboard/reports/Btrc"));
const ReportFinancial = lazy(() => import("@/pages/dashboard/reports/Financial"));

// SMS
const SmsIndividual = lazy(() => import("@/pages/dashboard/sms/Individual"));
const PopSmsTemplates = lazy(() => import("@/pages/reseller/PopSmsTemplates"));
const PopSmsIndividual = lazy(() => import("@/pages/reseller/sms/PopSmsIndividual"));
const PopSmsSend = lazy(() => import("@/pages/reseller/sms/PopSmsSend"));
const PopSmsGateway = lazy(() => import("@/pages/reseller/sms/PopSmsGateway"));
const PopTelegramSetup = lazy(() => import("@/pages/reseller/sms/PopTelegramSetup"));
const TelegramSetup = lazy(() => import("@/pages/dashboard/sms/TelegramSetup"));
const SmsTemplates = lazy(() => import("@/pages/dashboard/sms/Templates"));
const SmsGroups = lazy(() => import("@/pages/dashboard/sms/Groups"));
const SmsSend = lazy(() => import("@/pages/dashboard/sms/Send"));
const SmsGateway = lazy(() => import("@/pages/dashboard/sms/Gateway"));

// System
const SystemCompany = lazy(() => import("@/pages/dashboard/system/Company"));
const SystemInvoice = lazy(() => import("@/pages/dashboard/system/Invoice"));
const SystemPeriods = lazy(() => import("@/pages/dashboard/system/Periods"));
const SystemPaymentGateways = lazy(() => import("@/pages/dashboard/system/PaymentGateways"));
const SystemEmail = lazy(() => import("@/pages/dashboard/system/Email"));
const SystemSetup = lazy(() => import("@/pages/dashboard/system/Setup"));
const SystemProcessingFee = lazy(() => import("@/pages/dashboard/system/SysProcessingFee"));
const SystemLog = lazy(() => import("@/pages/dashboard/system/SystemLog"));
const SystemBillPeriodYears = lazy(() => import("@/pages/dashboard/system/BillPeriodYears"));
const SystemAutomaticProcess = lazy(() => import("@/pages/dashboard/system/AutomaticProcess"));
const SystemCustomDomain = lazy(() => import("@/pages/system/CustomDomainPage"));
const MySubscription = lazy(() => import("@/pages/MySubscription"));

// Config (additional)
const ConfigServiceTypes = lazy(() => import("@/pages/dashboard/config/ServiceTypes"));

// Website Panel
const WebsiteDashboard = lazy(() => import("@/pages/dashboard/website/WebsiteDashboard"));
const HomepageEditor = lazy(() => import("@/pages/dashboard/website/HomepageEditor"));
const WebsitePages = lazy(() => import("@/pages/dashboard/website/WebsitePages"));
const WebsiteNotices = lazy(() => import("@/pages/dashboard/website/WebsiteNotices"));
const WebsiteOffers = lazy(() => import("@/pages/dashboard/website/WebsiteOffers"));
const WebsiteTestimonials = lazy(() => import("@/pages/dashboard/website/WebsiteTestimonials"));
const WebsitePartners = lazy(() => import("@/pages/dashboard/website/WebsitePartners"));
const WebsiteFeatures = lazy(() => import("@/pages/dashboard/website/WebsiteFeatures"));
const WebsiteServices = lazy(() => import("@/pages/dashboard/website/WebsiteServices"));
const WebsiteFestivals = lazy(() => import("@/pages/dashboard/website/WebsiteFestivals"));
const WebsiteMenu = lazy(() => import("@/pages/dashboard/website/WebsiteMenu"));

const WebsiteMedia = lazy(() => import("@/pages/dashboard/website/WebsiteMedia"));
const WebsiteAbout = lazy(() => import("@/pages/dashboard/website/WebsiteAbout"));
const WebsiteSettings = lazy(() => import("@/pages/dashboard/website/WebsiteSettings"));

// Notes
const AdminNotes = lazy(() => import("@/pages/notes/AdminNotes"));
const PopNotes = lazy(() => import("@/pages/notes/PopNotes"));
const ClientNotes = lazy(() => import("@/pages/notes/ClientNotes"));

// Portal
import { PortalAuthProvider } from "@/contexts/PortalAuthContext";
import { PortalLayout } from "@/components/PortalLayout";
import PortalProtectedRoute from "@/components/PortalProtectedRoute";
const PortalLogin = lazy(() => import("@/pages/portal/PortalLogin"));
const PortalDashboard = lazy(() => import("@/pages/portal/PortalDashboard"));
const PortalInvoices = lazy(() => import("@/pages/portal/PortalInvoices"));

const PortalSupport = lazy(() => import("@/pages/portal/PortalSupport"));
const PortalNotices = lazy(() => import("@/pages/portal/PortalNotices"));
const PortalCompanyInfo = lazy(() => import("@/pages/portal/PortalCompanyInfo"));
const PortalMediaServers = lazy(() => import("@/pages/portal/PortalMediaServers"));
const PortalLedger = lazy(() => import("@/pages/portal/PortalLedger"));
const PortalLiveUsage = lazy(() => import("@/pages/portal/PortalLiveUsage"));
const PortalSpeedTest = lazy(() => import("@/pages/portal/PortalSpeedTest"));
const PortalShop = lazy(() => import("@/pages/portal/PortalShop"));
const PortalShopCheckout = lazy(() => import("@/pages/portal/PortalShopCheckout"));
const PortalMyOrders = lazy(() => import("@/pages/portal/PortalMyOrders"));
const PortalBills = lazy(() => import("@/pages/portal/PortalBills"));
const PortalBillInvoice = lazy(() => import("@/pages/portal/PortalBillInvoice"));
const PortalProfile = lazy(() => import("@/pages/portal/PortalProfile"));
const PortalMessages = lazy(() => import("@/pages/portal/PortalMessages"));
const PortalChangeRequest = lazy(() => import("@/pages/portal/PortalChangeRequest"));
const UserUpdateRequests = lazy(() => import("@/pages/dashboard/clients/UserUpdateRequests"));

// Reseller (POP Admin) Portal
import ResellerProtectedRoute from "@/components/ResellerProtectedRoute";
import { ResellerLayout } from "@/components/ResellerLayout";
const ResellerDashboard = lazy(() => import("@/pages/reseller/ResellerDashboard"));
const ResellerInvoices = lazy(() => import("@/pages/reseller/ResellerInvoices"));
const ResellerInvoiceDetail = lazy(() => import("@/pages/reseller/ResellerInvoiceDetail"));
const ResellerInvoicePrint = lazy(() => import("@/pages/reseller/ResellerInvoicePrint"));
const ResellerTickets = lazy(() => import("@/pages/reseller/ResellerTickets"));
const ResellerUsers = lazy(() => import("@/pages/reseller/ResellerUsers"));
const ResellerSettings = lazy(() => import("@/pages/reseller/ResellerSettings"));
const ResellerMikrotikUsers = lazy(() => import("@/pages/reseller/ResellerMikrotikUsers"));
const ResellerMikrotikBulkCreate = lazy(() => import("@/pages/reseller/ResellerMikrotikBulkCreate"));
// POP-scoped Configuration (admin pages reused; only Packages & AllotedAreas remain POP-specific)
const PopPackages = lazy(() => import("@/pages/reseller/config/PopPackages"));
const PopAllotedAreas = lazy(() => import("@/pages/reseller/config/PopAllotedAreas"));
const PopDevicesConfig = lazy(() => import("@/pages/reseller/config/PopDevices"));
// POP-scoped Employee
const PopEmployees = lazy(() => import("@/pages/reseller/employee/PopEmployees"));
const PopAddEmployee = lazy(() => import("@/pages/reseller/employee/PopAddEmployee"));
// POP-scoped Client
// PopClientList removed — /pop-admin/clients now reuses dashboard ClientList (POP-scoped via usePopScope)
const PopAddClient = lazy(() => import("@/pages/reseller/clients/PopAddClient"));
const PopBillingClient = lazy(() => import("@/pages/reseller/clients/PopBillingClient"));
const PopLeftClients = lazy(() => import("@/pages/reseller/clients/PopLeftClients"));
const PopScheduler = lazy(() => import("@/pages/reseller/clients/PopScheduler"));
const PopPlaceholder = lazy(() => import("@/pages/reseller/PopPlaceholder"));
const PopOnlineMonitoring = lazy(() => import("@/pages/reseller/PopOnlineMonitoring"));
const PopFundDebitHistory = lazy(() => import("@/pages/reseller/PopFundDebitHistory"));
// POP Reports
const PopBillCollection = lazy(() => import("@/pages/reseller/reports/PopBillCollection"));
const PopReportCustomer = lazy(() => import("@/pages/reseller/reports/PopCustomer"));
const PopReportMessages = lazy(() => import("@/pages/reseller/reports/PopMessages"));
const PopReportDueSms = lazy(() => import("@/pages/reseller/reports/PopDueSms"));
const PopReportProcessingFee = lazy(() => import("@/pages/reseller/reports/PopProcessingFee"));
const PopReportDiscount = lazy(() => import("@/pages/reseller/reports/PopDiscount"));

const PopReportFinancial = lazy(() => import("@/pages/reseller/reports/PopFinancial"));
const PopReportEnableDisable = lazy(() => import("@/pages/reseller/reports/PopEnableDisable"));
const PopFundCreditHistory = lazy(() => import("@/pages/reseller/PopFundCreditHistory"));
const PopSetup = lazy(() => import("@/pages/reseller/system/PopSetup"));
const PopBillPeriod = lazy(() => import("@/pages/reseller/system/PopBillPeriod"));
const PopPeriodSetup = lazy(() => import("@/pages/reseller/system/PopPeriodSetup"));
const PopInvoice = lazy(() => import("@/pages/reseller/system/PopInvoice"));
const PopEmail = lazy(() => import("@/pages/reseller/system/PopEmail"));
const PopPaymentGateways = lazy(() => import("@/pages/reseller/system/PopPaymentGateways"));
const PopProcessingFee = lazy(() => import("@/pages/reseller/system/PopProcessingFee"));
const PopAutomaticProcess = lazy(() => import("@/pages/reseller/system/PopAutomaticProcess"));
const PopActivityLog = lazy(() => import("@/pages/reseller/system/PopActivityLog"));
const PopIncome = lazy(() => import("@/pages/reseller/accounting/PopIncome"));
const PopExpense = lazy(() => import("@/pages/reseller/accounting/PopExpense"));
const PopCashBook = lazy(() => import("@/pages/reseller/accounting/PopCashBook"));
const PopEditEmployee = lazy(() => import("@/pages/reseller/employee/PopEditEmployee"));
const PopSalarySheet = lazy(() => import("@/pages/reseller/employee/PopSalarySheet"));
const PopDesignations = lazy(() => import("@/pages/reseller/config/PopDesignations"));
const PopBulkClientImport = lazy(() => import("@/pages/reseller/clients/PopBulkClientImport"));
const BulkClientImportHub = lazy(() => import("@/pages/reseller/clients/BulkClientImportHub"));

// Bandwidth Customer Portal
import BwProtectedRoute from "@/components/BwProtectedRoute";
import BwCustomerLayout from "@/components/BwCustomerLayout";
const BwDashboard = lazy(() => import("@/pages/bw-customer/BwDashboard"));
const BwInvoices = lazy(() => import("@/pages/bw-customer/BwInvoices"));
const BwPurchaseOrders = lazy(() => import("@/pages/bw-customer/BwPurchaseOrders"));
const BwTickets = lazy(() => import("@/pages/bw-customer/BwTickets"));
const BwSettings = lazy(() => import("@/pages/bw-customer/BwSettings"));

// BW Panel pages — now rendered inside the unified BwCustomerLayout
import BwPanelProtectedRoute from "@/components/BwPanelProtectedRoute";
import {
  BwPanelMikrotik, BwPanelMikrotikUsers, BwPanelClients, BwPanelClientAdd, BwPanelBulkImport,
  BwPanelLeftClients, BwPanelScheduler,
  BwPanelBilling, BwPanelDailyCollection, BwPanelTickets, BwPanelOnlineMonitoring,
  BwPanelSmsTemplates, BwPanelSmsSend, BwPanelSmsGateway,
  BwPanelEmployees, BwPanelAddEmployee, BwPanelSalarySheet,
  BwPanelIncome, BwPanelExpense, BwPanelCashBook,
  BwPanelBillCollection, BwPanelReportCustomer, BwPanelReportFinancial,
  BwPanelConfigZones, BwPanelConfigSubZones, BwPanelConfigBoxes, BwPanelConfigPackages,
  BwPanelConfigDepartments, BwPanelConfigDesignations, BwPanelConfigDevices,
  BwPanelClientNewRequest, BwPanelHomeClients, BwPanelCorporateClients, BwPanelChangeRequest,
  BwPanelInstallationFee,
  BwPanelSupportHistory, BwPanelSupportNotices,
  BwPanelConfigConnectionTypes, BwPanelConfigClientTypes, BwPanelConfigProtocolTypes,
  BwPanelConfigBillingStatuses, BwPanelConfigLocations, BwPanelConfigServiceTypes,
  BwPanelOltOverview, BwPanelOltDevices, BwPanelOltPower, BwPanelOnuList, BwPanelOltUsers,
  BwPanelOltPorts, BwPanelUserDownCount, BwPanelFiberDownFinder, BwPanelOltSharing,
  BwPanelMonOnline, BwPanelMonLiveTraffic, BwPanelMonSwitches, BwPanelMonPopDass,
  BwPanelMonPopIp, BwPanelMonPopLog, BwPanelMonPingTools, BwPanelMonPopDevices,
  BwPanelDeviceDashboard, BwPanelDeviceInventory,
} from "@/pages/bw-panel/wrappers";

// Redirect helper: any /reseller/<rest> → /pop-admin/<rest>
const LegacyResellerRedirect = () => {
  const path = window.location.pathname.replace(/^\/reseller/, "/pop-admin");
  return <Navigate to={path + window.location.search + window.location.hash} replace />;
};

// Redirect helper: any /bw-panel/<rest> → /bw/panel/<rest>
const LegacyBwPanelRedirect = () => {
  const path = window.location.pathname.replace(/^\/bw-panel/, "/bw/panel");
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
  <BootGate>
  <ThemeProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalLoadingOverlay />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}><Routes>
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
              <Route path="/dashboard/clients" element={<Navigate to="/dashboard/clients/home" replace />} />
              <Route path="/dashboard/clients/home" element={<P><HomeClients /></P>} />
              <Route path="/dashboard/clients/corporate" element={<P><CorporateClients /></P>} />
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
              <Route path="/dashboard/device-admin/oid-library" element={<P><DeviceAdminOidLibrary /></P>} />
              <Route path="/dashboard/device-admin/polling-agents" element={<P><DeviceAdminPollingAgents /></P>} />

              {/* HR */}
              <Route path="/dashboard/hr/departments" element={<P><HrDepartments /></P>} />
              <Route path="/dashboard/hr/payheads" element={<P><HrPayheads /></P>} />
              <Route path="/dashboard/hr/payroll" element={<P><HrPayroll /></P>} />
              <Route path="/dashboard/hr/positions" element={<P><HrPositions /></P>} />
              <Route path="/dashboard/hr/payslip" element={<P><HrPayslip /></P>} />
              <Route path="/dashboard/hr/payslip/print" element={<P><HrPayslipPrint /></P>} />
              <Route path="/dashboard/hr/employees/add" element={<P><HrAddEmployee /></P>} />
              <Route path="/dashboard/hr/employees" element={<P><HrEmployees /></P>} />
              <Route path="/dashboard/hr/employees/:id" element={<P><HrEmployeeView /></P>} />
              <Route path="/dashboard/hr/salary-sheet" element={<P><HrSalarySheet /></P>} />
              <Route path="/dashboard/hr/resign-rules" element={<P><HrResignRules /></P>} />
              <Route path="/dashboard/hr/resignations" element={<P><HrResignations /></P>} />
              <Route path="/dashboard/hr/rejoin" element={<P><HrRejoin /></P>} />
              <Route path="/dashboard/hr/attendance" element={<P><HrAttendance /></P>} />
              <Route path="/dashboard/hr/shifts" element={<P><HrShiftManagement /></P>} />
              <Route path="/dashboard/hr/zkteco-devices" element={<P><HrZktecoDevices /></P>} />
              <Route path="/dashboard/hr/attendance-rules" element={<P><HrAttendanceRules /></P>} />
              <Route path="/dashboard/hr/settings" element={<P><HrSettings /></P>} />
              <Route path="/dashboard/hr/attendance-report" element={<P><HrAttendanceReport /></P>} />
              <Route path="/dashboard/hr/geo-punch" element={<P><HrGeoPunch /></P>} />

              <Route path="/dashboard/hr/advance-salary" element={<P><HrAdvanceSalary /></P>} />
              <Route path="/dashboard/hr/loans" element={<P><HrEmployeeLoans /></P>} />
              <Route path="/dashboard/hr/facility-policies" element={<P><HrFacilityPolicies /></P>} />
              <Route path="/dashboard/hr/conveyance-bills" element={<P><HrConveyanceBills /></P>} />
              <Route path="/dashboard/hr/my-conveyance" element={<P><HrMyConveyance /></P>} />

              {/* Access Management */}
              <Route path="/dashboard/access/app-users" element={<P><AppUsers /></P>} />
              <Route path="/dashboard/access/roles" element={<P><AppRoles /></P>} />

              {/* OLT */}
              <Route path="/dashboard/olt" element={<P><OltDevices /></P>} />
              <Route path="/dashboard/olt/power-dashboard" element={<P><PowerDashboard /></P>} />
              <Route path="/dashboard/olt/onu" element={<P><OnuList /></P>} />
              <Route path="/dashboard/olt/online-monitoring" element={<P><OnlineMonitoring /></P>} />
              <Route path="/dashboard/olt/onu/:id" element={<P><OnuDetail /></P>} />
              <Route path="/dashboard/olt/users" element={<P><OltUsers /></P>} />
              <Route path="/dashboard/olt/ports" element={<P><OltPorts /></P>} />
              <Route path="/dashboard/olt/user-down" element={<P><UserDownCount /></P>} />
              <Route path="/dashboard/olt/fiber-down" element={<P><FiberDownFinder /></P>} />
              <Route path="/dashboard/olt/sharing" element={<P><OltSharing /></P>} />

              {/* OLT Mobile (NexOLT-style) */}
              <Route path="/m/olt" element={<P><MOltList /></P>} />
              <Route path="/m/olt/calculator" element={<P><MOpticalCalc /></P>} />
              <Route path="/m/olt/:id" element={<P><MOltOverview /></P>} />
              <Route path="/m/olt/:id/onus" element={<P><MOltOnuList /></P>} />
              <Route path="/m/olt/:id/more" element={<P><MOltMore /></P>} />

              {/* Network — Switches */}
              <Route path="/dashboard/network/switches" element={<P><NetworkSwitchList /></P>} />
              <Route path="/dashboard/network/switches/:id" element={<P><NetworkSwitchDetail /></P>} />

              {/* Network Monitoring */}
              <Route path="/dashboard/monitoring/online" element={<P><OnlineClientMonitoring /></P>} />
              <Route path="/dashboard/monitoring/live-traffic" element={<P><LiveTraffic /></P>} />
              <Route path="/dashboard/monitoring/top-users" element={<P><TopUsers /></P>} />
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

              {/* Leave Management — unified under HR (legacy routes redirect to same page with tab) */}
              <Route path="/dashboard/hr/leave" element={<P><LeaveManagement /></P>} />
              <Route path="/dashboard/leave/apply" element={<P><LeaveManagement /></P>} />
              <Route path="/dashboard/leave/approval" element={<P><LeaveManagement /></P>} />
              <Route path="/dashboard/leave/categories" element={<P><LeaveManagement /></P>} />
              <Route path="/dashboard/leave/setup" element={<P><LeaveManagement /></P>} />

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
              <Route path="/dashboard/bw-sale/panel-pricing" element={<P><BwSalePanelPricing /></P>} />

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
              <Route path="/dashboard/system/custom-domain" element={<P><SystemCustomDomain /></P>} />
              <Route path="/dashboard/my-subscription" element={<P><MySubscription /></P>} />
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

              {/* Bandwidth Customer Portal — unified layout (billing + optional panel) */}
              <Route path="/bw" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw/dashboard" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwDashboard /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/invoices" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwInvoices /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/invoices/:id" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><ResellerInvoiceDetail /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/invoices/:id/print" element={<PortalAuthProvider><BwProtectedRoute><ResellerInvoicePrint /></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/service-orders" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwPurchaseOrders /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/purchase-orders" element={<Navigate to="/bw/service-orders" replace />} />
              <Route path="/bw/tickets" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw/settings" element={<PortalAuthProvider><BwProtectedRoute><BwCustomerLayout><BwSettings /></BwCustomerLayout></BwProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel (Layer 2) — same shell, gated per-route by panel subscription */}
              <Route path="/bw/panel/dashboard" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw/panel/mikrotik" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMikrotik /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelClients /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/add" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelClientAdd /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/bulk" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelBulkImport /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/billing" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelBilling /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/billing/daily" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelDailyCollection /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/monitoring/online" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOnlineMonitoring /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/tickets" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw/panel/sms/templates" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelSmsTemplates /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/sms/send" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelSmsSend /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/sms/gateway" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelSmsGateway /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/employees" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelEmployees /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/employees/add" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelAddEmployee /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/accounting/income" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelIncome /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/accounting/expense" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelExpense /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/accounting/cashbook" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelCashBook /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/reports/bill-collection" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelBillCollection /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/reports/customer" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelReportCustomer /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/reports/financial" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelReportFinancial /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/settings" element={<Navigate to="/bw/settings" replace />} />

              {/* BW Panel — Configuration (admin pages, scoped to BW reseller's branch via usePopScope) */}
              <Route path="/bw/panel/config/zones" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigZones /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/sub-zones" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigSubZones /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/boxes" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigBoxes /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/packages" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigPackages /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/departments" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigDepartments /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/designations" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigDesignations /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/devices" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigDevices /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — extended Client + MikroTik users + employee */}
              <Route path="/bw/panel/mikrotik-users" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMikrotikUsers /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/left" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelLeftClients /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/scheduler" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelScheduler /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/employees/salary-sheet" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelSalarySheet /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — extended Clients */}
              <Route path="/bw/panel/clients/new-request" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelClientNewRequest /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/home" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelHomeClients /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/corporate" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelCorporateClients /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/change-request" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelChangeRequest /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/clients/installation-fee" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelInstallationFee /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — Support */}
              <Route path="/bw/panel/support/history" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw/panel/support/notices" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelSupportNotices /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — Configuration (extended) */}
              <Route path="/bw/panel/config/connection-types" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigConnectionTypes /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/client-types" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigClientTypes /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/protocol-types" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigProtocolTypes /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/billing-statuses" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigBillingStatuses /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/locations" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigLocations /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/config/service-types" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelConfigServiceTypes /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — OLT */}
              <Route path="/bw/panel/olt-overview" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOltOverview /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOltDevices /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/power-dashboard" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOltPower /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/onu" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOnuList /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/users" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOltUsers /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/ports" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOltPorts /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/user-down" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelUserDownCount /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/fiber-down" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelFiberDownFinder /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/olt/sharing" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelOltSharing /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — Network monitoring */}
              <Route path="/bw/panel/monitoring/live-traffic" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonLiveTraffic /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/network/switches" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonSwitches /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/monitoring/pop-dass" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonPopDass /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/monitoring/pop-ip" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonPopIp /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/monitoring/pop-log" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonPopLog /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/monitoring/ping-tools" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonPingTools /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/monitoring/pop-devices" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelMonPopDevices /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* BW Panel — Device admin */}
              <Route path="/bw/panel/device-admin" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelDeviceDashboard /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />
              <Route path="/bw/panel/device-admin/devices" element={<PortalAuthProvider><BwPanelProtectedRoute><BwCustomerLayout><BwPanelDeviceInventory /></BwCustomerLayout></BwPanelProtectedRoute></PortalAuthProvider>} />

              {/* Legacy /bw-panel/* → /bw/panel/* redirects */}
              <Route path="/bw-panel" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw-panel/dashboard" element={<Navigate to="/bw/dashboard" replace />} />
              <Route path="/bw-panel/*" element={<LegacyBwPanelRedirect />} />

              {/* POP Admin Portal */}
              <Route path="/pop-admin" element={<Navigate to="/pop-admin/dashboard" replace />} />
              <Route path="/pop-admin/login" element={<Navigate to="/login" replace />} />
              <Route path="/pop-admin/dashboard" element={<PortalAuthProvider><ResellerProtectedRoute require="dashboard"><ResellerLayout><ResellerDashboard /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/invoices" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerLayout><ResellerInvoices /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/invoices/:id" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerLayout><ResellerInvoiceDetail /></ResellerLayout></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/invoices/:id/print" element={<PortalAuthProvider><ResellerProtectedRoute require="invoices"><ResellerInvoicePrint /></ResellerProtectedRoute></PortalAuthProvider>} />
              <Route path="/pop-admin/tickets" element={<Navigate to="/pop-admin/dashboard" replace />} />
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
            </Routes></Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
  </BootGate>
);

export default App;
