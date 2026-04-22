import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Navigate } from "react-router-dom";

const PortalProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { customer, loading } = usePortalAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Loading...</span></div>;
  if (!customer) return <Navigate to="/portal/login" replace />;
  // Customer portal is only for clients/bw_customers. Resellers belong in /pop-admin.
  if (customer.type === "reseller" || customer.type === "reseller_sub") {
    return <Navigate to="/pop-admin/dashboard" replace />;
  }
  return <>{children}</>;
};

export default PortalProtectedRoute;
