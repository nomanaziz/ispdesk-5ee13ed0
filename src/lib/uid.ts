/**
 * Global UID helpers.
 * Format: TYPE-TENANTSHORT-SEQ6  (e.g. CLI-A7F3-000142)
 */

export type UidType = "CLI" | "BWC" | "EMP" | "RSL";

export function formatUid(uid?: string | null): string {
  return uid && uid.length > 0 ? uid : "—";
}

export function parseUid(uid: string): { type: UidType; tenantShort: string; seq: string } | null {
  const m = uid.match(/^([A-Z]{3})-([A-Z0-9]{4})-(\d{6})$/);
  if (!m) return null;
  return { type: m[1] as UidType, tenantShort: m[2], seq: m[3] };
}

export const UID_TYPE_LABELS: Record<UidType, string> = {
  CLI: "Client",
  BWC: "BW Customer",
  EMP: "Employee",
  RSL: "Reseller/POP",
};
