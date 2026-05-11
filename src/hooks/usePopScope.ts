import { usePortalAuth } from "@/contexts/PortalAuthContext";

/**
 * Detects POP-admin / Bandwidth-panel context from the portal session.
 *
 * - For `reseller` / `reseller_sub` (POP admin): branchId = customer.branch_id, tariff-based.
 * - For `bw_customer` with active panel subscription: branchId = customer.panel_branch_id,
 *   tariff-free (BW reseller manages its own packages directly).
 *
 * Pages should treat both as POP-scoped (`isPopMode === true`) and use `isBwPanel`
 * to skip tariff-only behaviour (warnings, locked profile from tariff, etc.).
 */
export function usePopScope() {
  const { customer } = usePortalAuth();
  const c: any = customer || {};

  const isBwPanel = c?.type === "bw_customer";
  const panelActive = isBwPanel
    ? !!c?.panel_access_enabled && !!c?.panel_subscription_expires_at && c.panel_subscription_expires_at > Date.now()
    : c?.type === "reseller" || c?.type === "reseller_sub";

  // Pick branchId from the right field per token type.
  const branchId: string | undefined = (isBwPanel
    ? (c?.panel_branch_id || c?.branch_id)
    : c?.branch_id) || undefined;

  const popId: string | undefined = isBwPanel
    ? (c?.sub || undefined)
    : c?.type === "reseller_sub"
      ? (c?.parent_reseller_id || undefined)
      : c?.sub;

  // BW panel resellers do not use admin-defined tariffs.
  const tariffId: string | undefined = isBwPanel ? undefined : (c?.tariff_id || undefined);
  const districtId: string | undefined = c?.district_id || undefined;
  const upazilaId: string | undefined = c?.upazila_id || undefined;

  return {
    isPopMode: !!branchId && panelActive,
    isBwPanel,
    branchId,
    popId,
    popName: c?.name,
    tariffId,
    districtId,
    upazilaId,
  };
}
