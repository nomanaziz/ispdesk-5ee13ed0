/**
 * Central icon resolver.
 * Priority: Icons8 (PNG, colorful, interactive) → Hishabee (SVG) → Lucide (handled by caller).
 *
 * Use `resolveIcon({ url, title, label })` to find the best icons8/hishabee name.
 * Components like MenuIconTile / IconCard accept the resolved name and gracefully
 * fall back to lucide when nothing matches.
 */

// ─── ICONS8 maps ────────────────────────────────────────────────────────────
// Keep these intentionally narrow & confident. Add more as user requests.

export const ICONS8_BY_URL: Record<string, string> = {
  "/dashboard": "business",
  "/dashboard/billing-overview": "combo-chart",
  "/dashboard/olt-overview": "pie-chart",
  "/dashboard/website": "website",
  "/dashboard/billing": "documents",
  "/dashboard/billing/daily-collection": "coins",
  "/dashboard/clients": "people",
  "/dashboard/clients/new-request": "address-book",
  "/dashboard/reports": "bar-chart",
  "/portal/dashboard": "business",
  "/portal/profile": "manager",
  "/portal/bills": "documents",
  "/portal/invoices": "documents",
  "/portal/ledger": "address-book",
  "/portal/support": "online-support",
  "/portal/notices": "news",
  "/portal/messages": "comments",
  "/portal/live-usage": "data-transfer",
  "/portal/speed-test": "increase",
  "/portal/shop": "shopping-mall",
  "/portal/my-orders": "delivery-time",
  "/portal/media": "shared-folder",
  "/portal/change-request": "process",
  "/pop-admin/dashboard": "business",
  "/pop-admin/billing/list": "documents",
  "/pop-admin/billing/daily-collection": "coins",
  "/pop-admin/monitoring/online": "wi-fi-connected",
  "/pop-admin/tickets": "online-support",
};

export const ICONS8_BY_LABEL: Record<string, string> = {
  // Bangla group labels
  "ড্যাশবোর্ড": "business",
  "ওয়েবসাইট প্যানেল": "website",
  "কনফিগারেশন": "administrative-tools",
  "VAS": "stack",
  "হোম ক্লায়েন্ট": "people",
  "POP / MAC ক্লায়েন্ট": "mac-client",
  "ব্যান্ডউইথ ক্লায়েন্ট": "data-transfer",
  "ডিভাইস": "router-symbol",
  "HR ও পেরোল": "manager",
  "OLT ম্যানেজমেন্ট": "server",
  "নেটওয়ার্ক মনিটরিং": "internet",
  "নেটওয়ার্ক ডায়াগ্রাম": "flow-chart",
  "ছুটি ম্যানেজমেন্ট": "schedule",
  "ইভেন্ট ও ছুটি": "schedule",
  "সাপোর্ট ও টিকেটিং": "online-support",
  "টাস্ক ম্যানেজমেন্ট": "tasks",
  "ব্যান্ডউইথ ক্রয়": "data-transfer",
  "ক্রয়": "shopping-mall",
  "বিক্রয় ও সার্ভিস": "profit",
  "ইনভেন্টরি": "stack",
  "অ্যাসেট": "guarantee",
  "অ্যাকাউন্টিং": "coins",
  "রিপোর্ট": "bar-chart",
  "SMS সার্ভিস": "comments",
  "ই-কমার্স": "shopping-mall",
  "সিস্টেম": "administrative-tools",
};

export const ICONS8_BY_TITLE: Record<string, string> = {
  // Common item titles (Bangla)
  "ড্যাশবোর্ড": "business",
  "ক্যাশবক্স": "coins",
  "এক্সপেন্স": "profit",
  "খরচ": "profit",
  "বকেয়া": "high-priority",
  "লেনদেন": "data-transfer",
  "প্রোডাক্ট": "stack",
  "পণ্য তালিকা": "stack",
  "স্টক": "stack",
  "প্রিন্টার": "documents",
  "SMS মার্কেটিং": "comments",
  "অনলাইন শপ": "shopping-mall",
  "ই-কমার্স": "shopping-mall",
  "ট্রেনিং": "school",
  "ওয়ারেন্টি": "warranty",
  "রিসাইকেল বিন": "reset",
  "মেয়াদোত্তীর্ণ": "high-priority",
  "সাবস্ক্রিপশন": "approval",
  "কুইক সেল": "delivery-time",
  "দ্রুত বিক্রয়": "delivery-time",
  "ক্রয় তালিকা": "shopping-mall",
  "কেনার তালিকা": "shopping-mall",
  "বিজনেস ওভারভিউ": "combo-chart",
  "কোম্পানি ওভারভিউ": "organization",
  "কন্টাক্ট": "address-book",
  "যোগাযোগ": "address-book",

  // Portal/common
  "নোটিশ": "news",
  "মেসেজ": "comments",
  "প্রোফাইল": "manager",
  "আমার প্রোফাইল": "manager",
  "মাসিক বিল": "documents",
  "ইনভয়েস": "documents",
  "লেজার": "address-book",
  "আমার লেজার": "address-book",
  "শপ": "shopping-mall",
  "আমার অর্ডার": "delivery-time",
  "সাপোর্ট টিকেট": "online-support",
  "লাইভ ব্যবহার": "data-transfer",
  "স্পিড টেস্ট": "increase",
  "মুভি/FTP সার্ভার": "shared-folder",
  "চেঞ্জ/আপডেট": "process",
  "আমার মেসেজ": "comments",

  // POP / Reseller
  "অনলাইন ক্লায়েন্ট": "wi-fi-connected",
  "অফলাইন ক্লায়েন্ট": "wi-fi",
  "মনিটরিং": "internet",
  "ব্যান্ডউইথ": "data-transfer",
  "টিকেট": "online-support",
  "সাপোর্ট": "online-support",
};

export interface IconLookup {
  url?: string;
  title?: string;
  label?: string;
}

/** Resolve to an icons8 name or null. */
export function resolveIcons8(input: IconLookup): string | undefined {
  const { url, title, label } = input;
  if (url && ICONS8_BY_URL[url]) return ICONS8_BY_URL[url];
  if (title && ICONS8_BY_TITLE[title]) return ICONS8_BY_TITLE[title];
  if (label && ICONS8_BY_LABEL[label]) return ICONS8_BY_LABEL[label];
  return undefined;
}
