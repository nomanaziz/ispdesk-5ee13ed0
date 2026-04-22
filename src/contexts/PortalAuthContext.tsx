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
  iat: number;
  exp: number;
}

interface PortalAuthContextType {
  customer: PortalCustomer | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string; type?: PortalUserType }>;
  logout: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextType>({
  customer: null,
  token: null,
  loading: true,
  login: async () => ({}),
  logout: () => {},
});

export const usePortalAuth = () => useContext(PortalAuthContext);

export const PortalAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (!res.ok) return { error: data.error || "Login failed" };
      localStorage.setItem("portal_token", data.token);
      setToken(data.token);
      setCustomer(data.customer);
      return { type: data.customer?.type as PortalUserType };
    } catch {
      return { error: "Network error. Please try again." };
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
    <PortalAuthContext.Provider value={{ customer, token, loading, login, logout }}>
      {children}
    </PortalAuthContext.Provider>
  );
};
