import { usePortalAuth } from "@/contexts/PortalAuthContext";

/**
 * Detects POP-admin context from the portal session.
 * When `isPopMode` is true, queries should be scoped via `.eq("branch_id", branchId)`.
 * Use across admin pages to make them POP-aware without duplicating components.
 */
export function usePopScope() {
  const { customer } = usePortalAuth();
  const branchId = (customer as any)?.branch_id || undefined;
  const popId = customer?.type === "reseller_sub"
    ? (customer as any)?.parent_reseller_id || undefined
    : (customer as any)?.sub;
  const tariffId = (customer as any)?.tariff_id || undefined;
  const districtId = (customer as any)?.district_id || undefined;
  const upazilaId = (customer as any)?.upazila_id || undefined;

  return {
    isPopMode: !!branchId,
    branchId,
    popId,
    popName: customer?.name,
    tariffId,
    districtId,
    upazilaId,
  };
}
