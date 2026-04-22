// Centralized template variable list and rendering utility.

export const TEMPLATE_VARIABLES = [
  "UserName",
  "ClientId",
  "Username",
  "Password",
  "MonthlyBillAmount",
  "Due",
  "BillingLastDate",
  "Month",
  "Amount",
  "OTP",
  "TicketId",
  "Subject",
  "Package",
  "OldPackage",
  "NewPackage",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export type TemplateVarValues = Partial<Record<string, string | number | null | undefined>>;

/**
 * Replace `{Variable}` tokens inside a template body with provided values.
 * Tokens that don't have a value are left as-is so missing data is visible.
 */
export function renderTemplate(content: string, values: TemplateVarValues = {}): string {
  if (!content) return "";
  return content.replace(/\{(\w+)\}/g, (full, key: string) => {
    const v = values[key];
    return v === undefined || v === null ? full : String(v);
  });
}

export const TEMPLATE_CATEGORIES = [
  { value: "general", label: "সাধারণ" },
  { value: "billing", label: "বিলিং" },
  { value: "payment", label: "পেমেন্ট" },
  { value: "registration", label: "রেজিস্ট্রেশন" },
  { value: "otp", label: "OTP" },
  { value: "support", label: "সাপোর্ট" },
] as const;

export function categoryLabel(cat?: string | null): string {
  return TEMPLATE_CATEGORIES.find((c) => c.value === cat)?.label || "সাধারণ";
}
