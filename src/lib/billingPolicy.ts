// Billing policy resolver — shared between UI and (future) billing engines.
//
// System-wide billing_mode (from `system_settings.billing_periods`):
//   - "month_to_month" → every client billed monthly
//   - "date_to_date"   → every client billed on their own anniversary date
//   - "hybrid"         → per-client override via clients.billing_policy
//
// In hybrid mode the Add/Edit Client form exposes a Billing Policy field.
// In the other two modes the per-client value is ignored and the system mode wins.

import { useSystemSetting } from "@/hooks/useSystemSetting";

export type SystemBillingMode = "month_to_month" | "date_to_date" | "hybrid";
export type ClientBillingPolicy = "monthly" | "date_to_date";

export interface BillingPeriodsConfig {
  billing_mode: SystemBillingMode;
  cycle_type?: string;
  billing_day?: number;
  grace_period_days?: number;
  auto_generate?: boolean;
}

export const BILLING_PERIODS_DEFAULT: BillingPeriodsConfig = {
  billing_mode: "month_to_month",
  cycle_type: "monthly",
  billing_day: 1,
  grace_period_days: 5,
  auto_generate: true,
};

export function resolveClientBillingPolicy(
  systemMode: SystemBillingMode | string | undefined,
  client: { billing_policy?: string | null } | null | undefined,
): ClientBillingPolicy {
  if (systemMode === "date_to_date") return "date_to_date";
  if (systemMode === "month_to_month") return "monthly";
  // hybrid (or unknown) → per-client field, default monthly
  const v = client?.billing_policy;
  return v === "date_to_date" ? "date_to_date" : "monthly";
}

/** Hook: returns the active system billing mode + helper booleans. */
export function useBillingMode() {
  const { value, isLoading } = useSystemSetting<BillingPeriodsConfig>(
    "billing_periods",
    BILLING_PERIODS_DEFAULT,
  );
  const mode = (value?.billing_mode || "month_to_month") as SystemBillingMode;
  return {
    mode,
    isHybrid: mode === "hybrid",
    isMonthly: mode === "month_to_month",
    isDateToDate: mode === "date_to_date",
    isLoading,
  };
}
