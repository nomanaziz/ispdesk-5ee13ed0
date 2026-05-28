// Map Postgres exceptions (e.g. from cash-on-hand guard) to Bangla user messages.
export function formatAccountingError(err: any): string {
  const msg = String(err?.message ?? err ?? "");
  if (msg.includes("INSUFFICIENT_CASH")) {
    return "Cash on hand অপ্রতুল। আগে Capital → Contributors / Transactions থেকে fund add করুন, তারপর আবার চেষ্টা করুন।";
  }
  return msg || "অজানা সমস্যা";
}
