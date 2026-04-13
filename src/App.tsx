import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
// Super Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ServiceRequests from "./pages/admin/ServiceRequests";
import CustomerManagement from "./pages/admin/CustomerManagement";
import PackageManager from "./pages/admin/PackageManager";
import PaymentTracking from "./pages/admin/PaymentTracking";
import CmsEditor from "./pages/admin/CmsEditor";
import FaqManager from "./pages/admin/FaqManager";

const queryClient = new QueryClient();

const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><DashboardLayout>{children}</DashboardLayout></ProtectedRoute>
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
              <Route path="/" element={<Landing />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Super Admin Dashboard */}
              <Route path="/admin" element={<P><AdminDashboard /></P>} />
              <Route path="/admin/requests" element={<P><ServiceRequests /></P>} />
              <Route path="/admin/customers" element={<P><CustomerManagement /></P>} />
              <Route path="/admin/packages" element={<P><PackageManager /></P>} />
              <Route path="/admin/payments" element={<P><PaymentTracking /></P>} />
              <Route path="/admin/cms" element={<P><CmsEditor /></P>} />
              <Route path="/admin/faq" element={<P><FaqManager /></P>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
