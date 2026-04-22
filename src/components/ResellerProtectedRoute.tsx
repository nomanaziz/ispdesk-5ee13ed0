import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  require?: "dashboard" | "invoices" | "purchases" | "tickets" | "users" | "settings" | "system" | "accounting";
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
  const allowed = ["reseller", "reseller_sub", "bw_customer"];
  if (!allowed.includes(customer.type as string)) {
    return <Navigate to="/portal/dashboard" replace />;
  }
  // Hide users page for BW customers (no sub-user feature yet)
  if (require === "users" && customer.type === "bw_customer") {
    return <Navigate to="/reseller/dashboard" replace />;
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
