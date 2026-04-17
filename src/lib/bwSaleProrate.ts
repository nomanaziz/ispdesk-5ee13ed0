// BW Sale pro-rate helpers — simplified single-row engine.
// Formula: amount = quantity × rate × (days_inclusive / total_days_in_billing_month)

export function getMonthRange(month: string): {
  period_start: string;
  period_end: string;
  total_days: number;
} {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const total = end.getUTCDate();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { period_start: fmt(start), period_end: fmt(end), total_days: total };
}

export function daysBetweenInclusive(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  if (b < a) return 0;
  return Math.floor((b - a) / 86400000) + 1;
}

/** Pro-rated line amount.  If from/to span the full month, this equals qty × rate. */
export function lineAmount(opts: {
  quantity: number;
  rate: number;
  fromDate?: string | null;
  toDate?: string | null;
  billingMonth?: string;
  vatPct?: number;
}): { days: number; totalDays: number; subtotal: number; vat: number; total: number } {
  const qty = Number(opts.quantity || 0);
  const rate = Number(opts.rate || 0);
  const vatPct = Number(opts.vatPct || 0);

  let totalDays = 30;
  if (opts.billingMonth) totalDays = getMonthRange(opts.billingMonth).total_days;

  let days = totalDays;
  if (opts.fromDate && opts.toDate) {
    days = daysBetweenInclusive(opts.fromDate, opts.toDate);
    if (!opts.billingMonth) totalDays = days;
  }

  const subtotal = qty * rate * (days / Math.max(totalDays, 1));
  const vat = subtotal * (vatPct / 100);
  const total = subtotal + vat;
  return {
    days,
    totalDays,
    subtotal: Math.round(subtotal * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
