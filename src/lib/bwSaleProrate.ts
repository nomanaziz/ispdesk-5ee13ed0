// BW Sale pro-rate helpers — thin wrapper around the shared bandwidthBilling engine.
// Kept for backward compatibility with existing imports.

import { supabase } from "@/integrations/supabase/client";
import {
  buildSegments,
  getMonthRange,
  type BillingSegment,
  type SubscriptionLike,
} from "@/lib/bandwidthBilling";

export interface InvoiceItemDraft {
  subscription_id: string | null;
  service_id: string | null;
  service_name: string;
  bandwidth_mbps: number;
  rate: number;
  period_start: string;
  period_end: string;
  days: number;
  total_days_in_month: number;
  amount: number;
  remarks?: string;
  sort_order: number;
}

export { getMonthRange };

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (s: string) => new Date(s + "T00:00:00");

export async function buildInvoiceItems(
  customerId: string,
  month: string,
): Promise<InvoiceItemDraft[]> {
  const { period_start, period_end, total_days } = getMonthRange(month);

  const [subsRes, svcRes] = await Promise.all([
    supabase
      .from("bw_customer_subscriptions")
      .select("*")
      .eq("customer_id", customerId)
      .lte("start_date", period_end)
      .or(`end_date.is.null,end_date.gte.${period_start}`),
    supabase.from("bw_sale_services").select("id, name"),
  ]);

  const subs = (subsRes.data as any[]) || [];
  const svcMap = new Map<string, string>();
  (svcRes.data || []).forEach((s: any) => svcMap.set(s.id, s.name));

  const enriched: SubscriptionLike[] = subs.map((s: any) => ({
    id: s.id,
    service_id: s.service_id,
    service_name: svcMap.get(s.service_id) || "Service",
    bandwidth_mbps: Number(s.bandwidth_mbps),
    rate_per_mbps: Number(s.rate_per_mbps),
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
  }));

  const segments: BillingSegment[] = buildSegments(
    enriched,
    period_start,
    period_end,
    total_days,
  );

  return segments.map((s) => ({ ...s }));
}

export async function applyServiceChange(params: {
  customerId: string;
  serviceId: string;
  newMbps: number;
  newRate: number;
  effectiveDate: string;
  reason?: string;
  changedBy?: string;
}) {
  const { customerId, serviceId, newMbps, newRate, effectiveDate, reason, changedBy } = params;

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
