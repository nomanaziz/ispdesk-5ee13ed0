// Shared helper for deriving the effective bill status across the app.
// Same rule used by the main admin daily-collection / billing-list:
//   - paid    : due <= 0
//   - partial : paid > 0 AND due > 0
//   - unpaid  : paid <= 0 AND due > 0   (also used for "no bill row")
//
// This avoids relying on stale `b.status` text from the database.

export type BillStatus = "paid" | "partial" | "unpaid";

export interface BillLike {
  status?: string | null;
  amount?: number | string | null;
  paid?: number | string | null;
  due?: number | string | null;
}

/**
 * Returns the effective billing status from amounts, falling back to the raw
 * `status` text only when amounts are not informative (e.g. legacy rows).
 */
export function getBillStatus(bill: BillLike | null | undefined): BillStatus {
  if (!bill) return "unpaid";
  const paid = Number(bill.paid || 0);
  const amount = Number(bill.amount || 0);
  const due = bill.due != null ? Number(bill.due) : Math.max(0, amount - paid);

  if (due <= 0) return "paid";
  if (paid > 0 && due > 0) return "partial";
  if (paid <= 0 && (due > 0 || amount > 0)) return "unpaid";

  // Fallback to raw status text if amounts give no signal.
  const raw = String(bill.status || "").toLowerCase();
  if (raw === "paid") return "paid";
  if (raw === "partial") return "partial";
  return "unpaid";
}

/** Bengali label for a derived bill status. */
export function getBillStatusLabel(status: BillStatus): string {
  if (status === "paid") return "পরিশোধিত";
  if (status === "partial") return "আংশিক";
  return "বকেয়া";
}

/** Tailwind classes for a status badge — matches main admin styling. */
export function getBillStatusBadgeClass(status: BillStatus): string {
  if (status === "paid") {
    return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
  }
  if (status === "partial") {
    return "bg-amber-500/20 text-amber-600 border-amber-500/30";
  }
  return "bg-red-500/20 text-red-600 border-red-500/30";
}
