import { usePopScope } from "./usePopScope";

/**
 * Returns helpers to scope queries to **admin-owned** clients only.
 *
 * Usage:
 *   const { applyClientScope, isPopMode } = useAdminScope();
 *   let q = supabase.from("clients").select("*");
 *   q = applyClientScope(q);
 *
 * - In POP mode (reseller portal acting as POP admin), returns query unchanged
 *   because POP pages already filter by `branch_id`.
 * - In Admin mode (head office), restricts to `owner_scope = 'admin'` so POP /
 *   reseller-owned clients are completely hidden.
 */
export function useAdminScope() {
  const { isPopMode } = usePopScope();

  /** Apply to any query touching the `clients` table directly. */
  const applyClientScope = <T extends { eq: (col: string, val: any) => T }>(q: T): T => {
    if (isPopMode) return q;
    return q.eq("owner_scope", "admin");
  };

  /**
   * Apply to a query on a related table (billing, bill_collections, etc.) where
   * we filter by inner-joined `clients.owner_scope`.
   * The select string MUST include `clients!inner(owner_scope)` for this to work.
   */
  const applyJoinedClientScope = <T extends { eq: (col: string, val: any) => T }>(q: T): T => {
    if (isPopMode) return q;
    return q.eq("clients.owner_scope", "admin");
  };

  return { isPopMode, applyClientScope, applyJoinedClientScope };
}
