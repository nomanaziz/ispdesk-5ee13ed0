import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "নাম আবশ্যক").max(100),
  client_id: z.string().trim().min(1, "ক্লায়েন্ট কোড আবশ্যক").max(50),
  contact: z
    .string()
    .trim()
    .regex(/^01\d{9}$/, "মোবাইল নম্বর অবশ্যই ১১ সংখ্যার হবে এবং 01 দিয়ে শুরু হবে"),
  nid_number: z
    .string()
    .trim()
    .regex(/^\d{10,17}$/, "NID/জন্ম সনদ নম্বর কমপক্ষে ১০ সংখ্যার হবে (শুধু সংখ্যা)")
    .optional()
    .or(z.literal("")),
});

export const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

export function validateMac(mac: string | undefined | null): string | null {
  if (!mac) return null;
  if (!macRegex.test(mac.trim())) {
    return "MAC address অবৈধ — hex format হতে হবে (যেমন AA:BB:CC:DD:EE:FF)";
  }
  return null;
}

export function lastDayOfMonth(year: number, monthIdx0: number): number {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

/** Returns dates 1..(lastDay-1) for current month — last day excluded */
export function expireDayOptions(refDate = new Date()): number[] {
  const last = lastDayOfMonth(refDate.getFullYear(), refDate.getMonth());
  return Array.from({ length: last - 1 }, (_, i) => i + 1);
}

/** Build full ISO date for a chosen day in current/next month based on today */
export function buildExpireDate(day: number, refDate = new Date()): string {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const d = new Date(y, m, day);
  return d.toISOString().slice(0, 10);
}
