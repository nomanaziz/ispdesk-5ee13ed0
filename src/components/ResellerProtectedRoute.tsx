import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  require?: "dashboard" | "invoices" | "purchases" | "tickets" | "users" | "settings";
}

const ResellerProtectedRoute = ({ children, require }: Props) => {
  const { customer, loading } = usePortalAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }
  if (!customer) return <Navigate to="/login" replace />;
  if (customer.type !== "reseller" && customer.type !== "reseller_sub") {
    return <Navigate to="/portal/dashboard" replace />;
  }
  // Sub-user permission gate
  if (require && customer.type === "reseller_sub" && customer.permissions) {
    if (!customer.permissions[require]) {
      return <Navigate to="/reseller/dashboard" replace />;
    }
  }
  return <>{children}</>;
};

export default ResellerProtectedRoute;
