// Helpers for POP-scoped (reseller portal) data filtering.
// All reseller pages MUST filter queries by the POP's branch_id so that
// one POP cannot see another POP's data.

export interface PopScope {
  /** branch_managers.id (reseller id) — for sub-users this is parent_reseller_id */
  popId: string | undefined;
  /** branches.id — used to filter rows in clients, billing, employees, etc. */
  branchId: string | undefined;
}

export function getPopScope(customer: any): PopScope {
  if (!customer) return { popId: undefined, branchId: undefined };
  const popId =
    customer.type === "reseller_sub"
      ? customer.parent_reseller_id || undefined
      : customer.sub;
  return { popId, branchId: customer.branch_id || undefined };
}
