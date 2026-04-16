import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Navigate } from "react-router-dom";

const ResellerProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { customer, loading } = usePortalAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }
  if (!customer) return <Navigate to="/login" replace />;
  if (customer.type !== "reseller") return <Navigate to="/portal/dashboard" replace />;
  return <>{children}</>;
};

export default ResellerProtectedRoute;
