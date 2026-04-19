/**
 * Centralized resolver for the BW billing identity (the id used in
 * `bw_sales_invoices.customer_id`, `bw_purchase_orders.reseller_id`, etc.).
 *
 * - reseller / bw_customer  → their own `sub`
 * - reseller_sub            → parent reseller id
 */
export function getBillingCustomerId(customer: {
  sub?: string;
  type?: string;
  parent_reseller_id?: string | null;
} | null | undefined): string | undefined {
  if (!customer) return undefined;
  if (customer.type === "reseller_sub") return customer.parent_reseller_id || undefined;
  return customer.sub;
}
