

## Billing Commitment Date (বিলিং তারিখ) System

### সংক্ষেপ

প্রতিটি client-এর একটি `billing_date` (1-27) থাকবে — সে প্রতি মাসে কত তারিখের মধ্যে বিল দিবে। এই তারিখ পার হলে MikroTik auto-disable হবে। বিল পরিশোধ করলে auto-enable হবে। Expire date click করে extend করা যাবে।

---

### পরিবর্তন সমূহ

#### 1. Billing List Table — `Ex.Date` কলাম উন্নতি

**`BillingList.tsx`** — বর্তমান `মেয়াদ` কলামে:
- `billing_date` number (1-27) দেখাবে বড় করে, নিচে ক্যালেন্ডার আইকন
- Click করলে একটি Popover খুলবে — Select dropdown (1-27) দিয়ে `billing_date` update করা যাবে
- `expire_date`-ও click করে extend করা যাবে — click করলে Popover-এ next billing date auto-calculate হবে (current month-এর `billing_date` তারিখ), save করলে `expire_date` update হবে

#### 2. BillReceiveDialog — Auto-enable on Paid

**`BillReceiveDialog.tsx`** — বিল full paid হলে:
- `mikrotik_status` = "enabled" DB-তে update
- `manage-mikrotik-ppp` edge function invoke করে MikroTik-এ enable করবে
- `expire_date` next month-এর `billing_date` তারিখে set হবে

#### 3. Enforce Billing Edge Function — `billing_date` ভিত্তিক

**`enforce-billing/index.ts`** — বর্তমান `expire_date` based logic-এর সাথে `billing_date` logic যোগ:
- প্রতিটি client-এর `billing_date` check করবে
- আজকের তারিখ যদি `billing_date`-এর পরে হয় এবং current month-এ paid না হলে → disable
- System setting থেকে `cutoff_time` পড়বে (same day / next day)
- VIP এবং Free client বাদ যাবে

#### 4. System Setup — Enforcement Timing

**`Setup.tsx`** — Billing Enforcement সেকশনে:
- "কোন সময় বন্ধ হবে" — cutoff time selector (already exists)
- "Same date নাকি Next date" — নতুন option যোগ: `enforcement_day: "same" | "next"` — billing_date-এর দিনেই disable হবে নাকি পরের দিন

#### 5. Billing Date Edit Popover Component

**নতুন ফাইল: `src/components/billing/BillingDatePopover.tsx`**
- Click করলে Popover open
- Select (1-27) দিয়ে billing_date change
- Save করলে DB update + toast

### Files

| File | Change |
|------|--------|
| `src/components/billing/BillingDatePopover.tsx` | **নতুন** — Billing date edit popover (1-27 select) |
| `src/pages/dashboard/billing/BillingList.tsx` | `মেয়াদ` কলামে BillingDatePopover ব্যবহার, expire_date extend |
| `src/components/billing/BillReceiveDialog.tsx` | Full paid হলে MikroTik auto-enable + expire_date extend |
| `supabase/functions/enforce-billing/index.ts` | `billing_date` ভিত্তিক disable logic, `enforcement_day` setting support |
| `src/pages/dashboard/system/Setup.tsx` | `enforcement_day` (same/next) option যোগ |

### Technical Details

- `clients.billing_date` column already exists (integer, default 1)
- Range: 1-27 (28+ allowed নয় — shortest month consideration)
- Enforce billing cron: checks `billing_date` against current date, respects `cutoff_time` and `enforcement_day`
- Auto-enable on payment: calls `manage-mikrotik-ppp` with action "enable" after successful bill receive

