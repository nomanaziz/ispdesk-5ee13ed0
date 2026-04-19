// Unified bandwidth billing engine — shared by BW Buy and BW Sale.
// Pro-rate formula: amount = mbps × monthly_rate × days / total_days_in_month
//
// User scenario verification (1 Mbps @ 200 BDT/month, 30-day month, upgrade to 2 Mbps on day 16):
//   Segment A: 1 × 200 × 15 / 30 = 100   (days 1–15 with 1 Mbps)
//   Segment B: 2 × 200 × 15 / 30 = 200   (days 16–30 with 2 Mbps)
//   Total = 300 ✓
//
// Supports dynamic month length (28/29/30/31), multiple upgrades/downgrades
// within a month, accurate cumulative billing.

export interface SubscriptionLike {
  id?: string | null;
  service_id?: string | null;
  service_name?: string;
  bandwidth_mbps: number;
  rate_per_mbps: number;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  status?: string;
}

export interface BillingSegment {
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
  sort_order: number;
}

const toDate = (s: string) => new Date(s + "T00:00:00");
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

export function getMonthRange(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const total = daysInMonth(y, m);
  return {
    period_start: `${month}-01`,
    period_end: `${month}-${String(total).padStart(2, "0")}`,
    total_days: total,
    year: y,
    month: m,
  };
}

export function perDayCost(monthlyRate: number, totalDaysInMonth: number): number {
  if (!totalDaysInMonth) return 0;
  return monthlyRate / totalDaysInMonth;
}

export function lineAmount(
  mbps: number,
  monthlyRate: number,
  days: number,
  totalDaysInMonth: number,
): number {
  if (!totalDaysInMonth) return 0;
  return (Number(mbps) * Number(monthlyRate) * Number(days)) / Number(totalDaysInMonth);
}

const daysBetweenInclusive = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;

/**
 * Build pro-rated billing segments from a list of subscription rows (each
 * subscription represents one immutable mbps/rate state with start/end).
 * Mid-month changes are modeled as: old.end_date = day-before, new.start_date = day-of.
 */
export function buildSegments(
  subscriptions: SubscriptionLike[],
  periodStart: string,
  periodEnd: string,
  totalDaysInMonth: number,
  options?: { round?: number },
): BillingSegment[] {
  const ps = toDate(periodStart);
  const pe = toDate(periodEnd);
  const round = options?.round ?? 2;
  const factor = Math.pow(10, round);

  const segments: BillingSegment[] = [];
  let order = 0;

  // Group by service for stable ordering
  const sorted = [...subscriptions].sort((a, b) => {
    const sn = (a.service_name || "").localeCompare(b.service_name || "");
    if (sn !== 0) return sn;
    return a.start_date.localeCompare(b.start_date);
  });

  for (const sub of sorted) {
    const subStart = toDate(sub.start_date);
    const subEnd = sub.end_date ? toDate(sub.end_date) : pe;
    const segStart = subStart > ps ? subStart : ps;
    const segEnd = subEnd < pe ? subEnd : pe;
    if (segEnd < segStart) continue;
    const days = daysBetweenInclusive(segStart, segEnd);
    const raw = lineAmount(
      Number(sub.bandwidth_mbps),
      Number(sub.rate_per_mbps),
      days,
      totalDaysInMonth,
    );
    segments.push({
      subscription_id: sub.id ?? null,
      service_id: sub.service_id ?? null,
      service_name: sub.service_name || "Service",
      bandwidth_mbps: Number(sub.bandwidth_mbps),
      rate: Number(sub.rate_per_mbps),
      period_start: fmt(segStart),
      period_end: fmt(segEnd),
      days,
      total_days_in_month: totalDaysInMonth,
      amount: Math.round(raw * factor) / factor,
      sort_order: order++,
    });
  }

  return segments;
}

export function totalBill(segments: BillingSegment[]): number {
  return segments.reduce((s, x) => s + Number(x.amount || 0), 0);
}

/**
 * One-shot helper: given a list of subscriptions and a "YYYY-MM" month,
 * return billing segments for that calendar month.
 */
/**
 * Pro-rate the first month's bill for a mid-month join.
 * Formula: (monthly_price / total_days_in_month) × days_remaining
 * Returns the prorated amount + helper info.
 */
export function proRateFirstMonth(
  joinDateStr: string, // YYYY-MM-DD
  monthlyPrice: number,
): { amount: number; days: number; total_days_in_month: number; period_start: string; period_end: string; month: string } {
  const join = toDate(joinDateStr);
  const y = join.getFullYear();
  const m = join.getMonth() + 1;
  const total = daysInMonth(y, m);
  const joinDay = join.getDate();
  const daysRemaining = total - joinDay + 1;
  const amount = Math.round(((Number(monthlyPrice) / total) * daysRemaining) * 100) / 100;
  const monthStr = `${y}-${String(m).padStart(2, "0")}`;
  return {
    amount,
    days: daysRemaining,
    total_days_in_month: total,
    period_start: joinDateStr,
    period_end: `${monthStr}-${String(total).padStart(2, "0")}`,
    month: `${monthStr}-01`,
  };
}

export function buildMonthlySegments(
  subscriptions: SubscriptionLike[],
  month: string,
): { segments: BillingSegment[]; total: number; range: ReturnType<typeof getMonthRange> } {
  const range = getMonthRange(month);
  const segments = buildSegments(
    subscriptions,
    range.period_start,
    range.period_end,
    range.total_days,
  );
  return { segments, total: totalBill(segments), range };
}
