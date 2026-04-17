// Pro-rated invoice line-item generator for BW Sale
// Splits each subscription into segments based on service-change events
// inside the billing period and computes amount = mbps * rate * days / total_days_in_month

import { supabase } from "@/integrations/supabase/client";

export interface InvoiceItemDraft {
  subscription_id: string | null;
  service_id: string | null;
  service_name: string;
  bandwidth_mbps: number;
  rate: number;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  days: number;
  total_days_in_month: number;
  amount: number;
  remarks?: string;
  sort_order: number;
}

const toDate = (s: string) => new Date(s + "T00:00:00");
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
const lastDayOfMonth = (year: number, monthIdx: number) =>
  new Date(year, monthIdx + 1, 0).getDate();

export function getMonthRange(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m - 1, lastDayOfMonth(y, m - 1));
  return {
    period_start: fmt(start),
    period_end: fmt(end),
    total_days: lastDayOfMonth(y, m - 1),
  };
}

interface Subscription {
  id: string;
  service_id: string;
  bandwidth_mbps: number;
  rate_per_mbps: number;
  start_date: string;
  end_date: string | null;
  status: string;
  service?: { id: string; name: string } | null;
}

interface ChangeLog {
  id: string;
  service_id: string;
  effective_date: string;
  old_mbps: number | null;
  new_mbps: number | null;
  old_rate: number | null;
  new_rate: number | null;
  old_subscription_id: string | null;
  new_subscription_id: string | null;
}

/**
 * Build invoice line items for a customer for a given month.
 * Logic:
 *  - For each service the customer has had any subscription in [periodStart..periodEnd]
 *  - Walk through change events sorted by effective_date and emit a segment per state.
 *  - amount per segment = mbps * rate * (days / total_days_in_month)
 */
export async function buildInvoiceItems(
  customerId: string,
  month: string,
): Promise<InvoiceItemDraft[]> {
  const { period_start, period_end, total_days } = getMonthRange(month);
  const ps = toDate(period_start);
  const pe = toDate(period_end);

  const [subsRes, chgRes, svcRes] = await Promise.all([
    supabase
      .from("bw_customer_subscriptions")
      .select("*")
      .eq("customer_id", customerId)
      .lte("start_date", period_end)
      .or(`end_date.is.null,end_date.gte.${period_start}`),
    supabase
      .from("bw_service_change_log")
      .select("*")
      .eq("customer_id", customerId)
      .gte("effective_date", period_start)
      .lte("effective_date", period_end)
      .order("effective_date", { ascending: true }),
    supabase.from("bw_sale_services").select("id, name"),
  ]);

  const subs: Subscription[] = (subsRes.data as any) || [];
  const changes: ChangeLog[] = (chgRes.data as any) || [];
  const svcMap = new Map<string, string>();
  (svcRes.data || []).forEach((s: any) => svcMap.set(s.id, s.name));

  // Group subscriptions by service
  const byService = new Map<string, Subscription[]>();
  for (const s of subs) {
    if (!byService.has(s.service_id)) byService.set(s.service_id, []);
    byService.get(s.service_id)!.push(s);
  }

  const items: InvoiceItemDraft[] = [];
  let order = 0;

  for (const [serviceId, subList] of byService.entries()) {
    // For each subscription emit its active window inside [ps..pe]
    // Simpler model: each sub already represents one "state"; mid-month upgrade
    // creates 2 subs (old end_date = day before change, new start_date = change day).
    for (const sub of subList) {
      const subStart = toDate(sub.start_date);
      const subEnd = sub.end_date ? toDate(sub.end_date) : pe;
      const segStart = subStart > ps ? subStart : ps;
      const segEnd = subEnd < pe ? subEnd : pe;
      if (segEnd < segStart) continue;
      const days = daysBetween(segStart, segEnd);
      const amount =
        (Number(sub.bandwidth_mbps) * Number(sub.rate_per_mbps) * days) /
        total_days;
      items.push({
        subscription_id: sub.id,
        service_id: sub.service_id,
        service_name: svcMap.get(sub.service_id) || "Service",
        bandwidth_mbps: Number(sub.bandwidth_mbps),
        rate: Number(sub.rate_per_mbps),
        period_start: fmt(segStart),
        period_end: fmt(segEnd),
        days,
        total_days_in_month: total_days,
        amount: Math.round(amount * 100) / 100,
        sort_order: order++,
      });
    }
  }

  // Sort: service group then date
  items.sort((a, b) =>
    a.service_name.localeCompare(b.service_name) ||
    a.period_start.localeCompare(b.period_start),
  );
  return items;
}

/**
 * Apply a service change: close the active subscription at (effective_date - 1)
 * and open a new one starting effective_date. Records change log entry.
 */
export async function applyServiceChange(params: {
  customerId: string;
  serviceId: string;
  newMbps: number;
  newRate: number;
  effectiveDate: string; // YYYY-MM-DD
  reason?: string;
  changedBy?: string;
}) {
  const { customerId, serviceId, newMbps, newRate, effectiveDate, reason, changedBy } = params;

  // Find current active subscription for this service
  const { data: actives } = await supabase
    .from("bw_customer_subscriptions")
    .select("*")
    .eq("customer_id", customerId)
    .eq("service_id", serviceId)
    .eq("status", "active")
    .is("end_date", null)
    .limit(1);

  const current = actives?.[0];
  const dayBefore = fmt(new Date(toDate(effectiveDate).getTime() - 86400000));

  let oldSubId: string | null = null;
  let oldMbps: number | null = null;
  let oldRate: number | null = null;

  if (current) {
    oldSubId = current.id;
    oldMbps = Number(current.bandwidth_mbps);
    oldRate = Number(current.rate_per_mbps);
    await supabase
      .from("bw_customer_subscriptions")
      .update({ end_date: dayBefore, status: "closed" })
      .eq("id", current.id);
  }

  const { data: newSub, error } = await supabase
    .from("bw_customer_subscriptions")
    .insert({
      customer_id: customerId,
      service_id: serviceId,
      bandwidth_mbps: newMbps,
      rate_per_mbps: newRate,
      start_date: effectiveDate,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("bw_service_change_log").insert({
    customer_id: customerId,
    service_id: serviceId,
    old_subscription_id: oldSubId,
    new_subscription_id: newSub.id,
    old_mbps: oldMbps,
    new_mbps: newMbps,
    old_rate: oldRate,
    new_rate: newRate,
    effective_date: effectiveDate,
    change_type: oldMbps == null ? "new" : newMbps > (oldMbps || 0) ? "upgrade" : "downgrade",
    reason,
    changed_by: changedBy,
  });

  return newSub;
}
