import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Navigate } from "react-router-dom";

/**
 * Guard for /bw-panel/* routes — independent BW customer panel.
 * Requires:
 *  - customer.type === "bw_customer"
 *  - panel_access_enabled === true
 *  - panel_subscription_expires_at > now()
 * On failure → /bw/dashboard (always-on billing layer).
 */
const BwPanelProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
    if (customer.type === "reseller" || customer.type === "reseller_sub") {
      return <Navigate to="/pop-admin/dashboard" replace />;
    }
    return <Navigate to="/portal/dashboard" replace />;
  }
  const active = !!customer.panel_access_enabled
    && customer.panel_subscription_expires_at
    && customer.panel_subscription_expires_at > Date.now();
  if (!active) return <Navigate to="/bw/dashboard" replace />;
  return <>{children}</>;
};

export default BwPanelProtectedRoute;
