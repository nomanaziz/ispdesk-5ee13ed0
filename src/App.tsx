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

// Public pages
import Home from "@/pages/public/Home";
import Packages from "@/pages/public/Packages";
import Coverage from "@/pages/public/Coverage";
import NewConnection from "@/pages/public/NewConnection";
import QuickPay from "@/pages/public/QuickPay";
import Services from "@/pages/public/Services";
import About from "@/pages/public/About";

// Auth pages
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

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

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* ERP Dashboard (protected) */}
              <Route path="/dashboard" element={<P><Dashboard /></P>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
