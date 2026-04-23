import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Navigate } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  /** If true, this route requires an active panel subscription. */
  requirePanel?: boolean;
}

/** Guard for /bw/* routes — only bw_customer allowed. */
const BwProtectedRoute = ({ children, requirePanel }: Props) => {
  const { customer, loading } = usePortalAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }
  if (!customer) return <Navigate to="/login" replace />;
  if (customer.type !== "bw_customer") {
    // Resellers belong in /pop-admin, clients in /portal
    if (customer.type === "reseller" || customer.type === "reseller_sub") {
      return <Navigate to="/pop-admin/dashboard" replace />;
    }
    return <Navigate to="/portal/dashboard" replace />;
  }
  if (requirePanel) {
    const active = !!customer.panel_access_enabled
      && customer.panel_subscription_expires_at
      && customer.panel_subscription_expires_at > Date.now();
    if (!active) return <Navigate to="/bw/dashboard" replace />;
  }
  return <>{children}</>;
};

export default BwProtectedRoute;
