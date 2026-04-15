

## Plan: Billing Type Configuration — Date-to-Date vs Month-to-Month

### Overview
ISP billing has two modes:
- **Month-to-Month**: All active users get bills generated on the 1st of every month (midnight 12:00-12:30 idle, then auto-generate)
- **Date-to-Date**: Each user's bill generates on the anniversary of their connection date

This setting will be added to the existing **Periods** page (`System > পিরিয়ড সেটআপ`).

### Changes

**1. `src/pages/dashboard/system/Periods.tsx`**
- Add a new field `billing_mode` to the `PeriodsConfig` interface with values: `"month_to_month"` | `"date_to_date"`
- Default: `"month_to_month"`
- Place it as the **first field** in the form, before cycle type
- When `billing_mode = "month_to_month"`: show the existing "বিলিং দিন" field (which day of month to generate bills)
- When `billing_mode = "date_to_date"`: hide "বিলিং দিন" (since each client's connection date determines their billing date)
- Add a small helper text under the select explaining each mode:
  - Month-to-Month: "সকল ক্লায়েন্টের বিল একই তারিখে জেনারেট হবে"
  - Date-to-Date: "প্রতিটি ক্লায়েন্টের কানেকশন তারিখ অনুযায়ী বিল জেনারেট হবে"

No database migration needed — this is stored as JSON in `system_settings` via the existing `useSystemSetting` hook.

### Technical Details
- Only 1 file edited: `Periods.tsx`
- The `billing_mode` value will be read later by the auto-billing cron job to determine generation logic
- Grace period and cycle type fields remain visible in both modes

