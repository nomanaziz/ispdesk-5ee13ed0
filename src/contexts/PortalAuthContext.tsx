import React, { createContext, useContext, useState, useEffect } from "react";

export type PortalUserType = "client" | "bw_customer" | "reseller" | "reseller_sub";

export interface ResellerPermissions {
  dashboard: boolean;
  invoices: boolean;
  
  tickets: boolean;
  users: boolean;
  settings: boolean;
  system?: boolean;
  accounting?: boolean;
  [key: string]: boolean | undefined;
}

interface PortalCustomer {
  sub: string;
  name: string;
  code: string;
  username: string;
  type: PortalUserType;
  session_id?: string;
  pop_id?: string | null;
  email?: string | null;
  mobile?: string | null;
  contact_person?: string | null;
  address?: string | null;
  branch_id?: string | null;
  zone_id?: string | null;
  package_id?: string | null;
  monthly_bill?: number | null;
  balance?: number | null;
  tariff_id?: string | null;
  district_id?: string | null;
  upazila_id?: string | null;
  parent_reseller_id?: string | null;
  pop_type?: string | null;
  permissions?: ResellerPermissions | null;
  // Bandwidth-customer panel subscription
  panel_access_enabled?: boolean;
  panel_user_limit?: number | null;
  panel_subscription_expires_at?: number | null; // epoch ms
  panel_branch_id?: string | null;
  iat: number;
  exp: number;
}

interface PortalAuthContextType {
  customer: PortalCustomer | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string; type?: PortalUserType }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType>({
  customer: null,
  token: null,
  loading: true,
  login: async () => ({}),
  logout: () => {},
  refresh: async () => {},
});

export const usePortalAuth = () => useContext(PortalAuthContext);

// Synchronously read the stored portal token so that PortalAuthProvider
// instances mounted on every route don't briefly flash a null `customer`
// (which previously caused panel sidebar items to disappear on navigation).
const readStoredAuth = (): { customer: PortalCustomer | null; token: string | null } => {
  if (typeof window === "undefined") return { customer: null, token: null };
  try {
    const stored = window.localStorage.getItem("portal_token");
    if (!stored) return { customer: null, token: null };
    const decoded: PortalCustomer = JSON.parse(atob(stored));
    if (decoded?.exp && decoded.exp > Date.now()) {
      return { customer: decoded, token: stored };
    }
  } catch {
    // ignore — treat as not logged in
  }
  return { customer: null, token: null };
};

export const PortalAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const initial = readStoredAuth();
  const [customer, setCustomer] = useState<PortalCustomer | null>(initial.customer);
  const [token, setToken] = useState<string | null>(initial.token);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pick up impersonation token from URL hash (one-shot)
    const hash = window.location.hash;
    if (hash.startsWith("#imp=")) {
      try {
        const impToken = decodeURIComponent(hash.slice(5));
        const decoded: PortalCustomer = JSON.parse(atob(impToken));
        if (decoded.exp > Date.now()) {
          localStorage.setItem("portal_token", impToken);
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          setCustomer(decoded);
          setToken(impToken);
          setLoading(false);
          return;
        }
      } catch {
        // fall through to normal flow
      }
    }

    const stored = localStorage.getItem("portal_token");
    if (stored) {
      try {
        const decoded: PortalCustomer = JSON.parse(atob(stored));
        if (decoded.exp > Date.now()) {
          setCustomer(decoded);
          setToken(stored);
        } else {
          localStorage.removeItem("portal_token");
        }
      } catch {
        localStorage.removeItem("portal_token");
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/portal-auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );
      const data = await res.json();
      if (!res.ok || data?.error || !data?.token || !data?.customer) {
        return { error: data?.error || "Login failed" };
      }
      localStorage.setItem("portal_token", data.token);
      setToken(data.token);
      setCustomer(data.customer);
      return { type: data.customer?.type as PortalUserType };
    } catch {
      return { error: "Network error. Please try again." };
    }
  };

  const refresh = async () => {
    // Re-issue token using the same identifier — used after panel activation
    if (!customer?.username) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/portal-auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh", session_id: customer.session_id, sub: customer.sub, type: customer.type }),
        }
      );
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("portal_token", data.token);
        setToken(data.token);
        setCustomer(data.customer);
      }
    } catch {
      // ignore — caller can retry
    }
  };

  const logout = () => {
    const sid = customer?.session_id;
    if (sid) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/portal-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", session_id: sid }),
      }).catch(() => {});
    }
    localStorage.removeItem("portal_token");
    setToken(null);
    setCustomer(null);
  };

  return (
    <PortalAuthContext.Provider value={{ customer, token, loading, login, logout, refresh }}>
      {children}
    </PortalAuthContext.Provider>
  );
};
