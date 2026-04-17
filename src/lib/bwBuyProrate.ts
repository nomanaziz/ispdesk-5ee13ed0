// BW Buy (purchase) pro-rate helpers using the shared bandwidthBilling engine.
// Provider × service subscriptions; mid-month upgrades create a new active row
// and close the previous one at (effective_date - 1).

import { supabase } from "@/integrations/supabase/client";
import {
  buildSegments,
  getMonthRange,
  type BillingSegment,
  type SubscriptionLike,
} from "@/lib/bandwidthBilling";

export type BuyBillItemDraft = BillingSegment;

export { getMonthRange };

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const toDate = (s: string) => new Date(s + "T00:00:00");

export async function buildBuyBillItems(
  providerId: string,
  month: string,
): Promise<BuyBillItemDraft[]> {
  const { period_start, period_end, total_days } = getMonthRange(month);

  const { data: subs } = await supabase
    .from("bw_buy_provider_subscriptions")
    .select("*")
    .eq("provider_id", providerId)
    .lte("start_date", period_end)
    .or(`end_date.is.null,end_date.gte.${period_start}`);

  const enriched: SubscriptionLike[] = (subs || []).map((s: any) => ({
    id: s.id,
    service_id: s.service_id,
    service_name: s.service_name || "Service",
    bandwidth_mbps: Number(s.bandwidth_mbps),
    rate_per_mbps: Number(s.rate_per_mbps),
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status,
  }));

  return buildSegments(enriched, period_start, period_end, total_days);
}

export async function applyBuyServiceChange(params: {
  providerId: string;
  subscriptionId: string;
  newMbps: number;
  newRate: number;
  effectiveDate: string;
  reason?: string;
}) {
  const { providerId, subscriptionId, newMbps, newRate, effectiveDate, reason } = params;

  const { data: current, error: fetchErr } = await supabase
    .from("bw_buy_provider_subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();
  if (fetchErr) throw fetchErr;

  const dayBefore = fmt(new Date(toDate(effectiveDate).getTime() - 86400000));
  const oldMbps = Number(current.bandwidth_mbps);
  const oldRate = Number(current.rate_per_mbps);

  await supabase
    .from("bw_buy_provider_subscriptions")
    .update({ end_date: dayBefore, status: "closed" })
    .eq("id", subscriptionId);

  const { data: newSub, error } = await supabase
    .from("bw_buy_provider_subscriptions")
    .insert({
      provider_id: providerId,
      service_id: current.service_id,
      service_name: current.service_name,
      bandwidth_mbps: newMbps,
      rate_per_mbps: newRate,
      start_date: effectiveDate,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("bw_buy_service_change_log").insert({
    provider_id: providerId,
    service_id: current.service_id,
    old_subscription_id: subscriptionId,
    new_subscription_id: newSub.id,
    old_mbps: oldMbps,
    new_mbps: newMbps,
    old_rate: oldRate,
    new_rate: newRate,
    effective_date: effectiveDate,
    change_type: newMbps > oldMbps ? "upgrade" : newMbps < oldMbps ? "downgrade" : "rate_change",
    reason,
  });

  return newSub;
}
