

## Bandwidth Billing — Unified Pro-rated Engine (Buy + Sell)

### বর্তমান অবস্থা

**BW Sale** এ ইতোমধ্যে আছে `src/lib/bwSaleProrate.ts` যা মোটামুটি logic implement করে, কিন্তু:
- Formula এ `total_days_in_month` hardcoded month length ব্যবহার করে — fine
- কিন্তু **rate × days / total_days** = exact যা user চাইছে ✓
- তবে `Math.round(amount * 100) / 100` করে — paisa-level rounding

**BW Buy** এ এই logic **নেই** — `src/pages/dashboard/bw-buy/BillForm.tsx` flat amount নেয়। Provider থেকে কেনা bandwidth ও এই same pro-rate logic দরকার (image-অনুযায়ী Internet/NIX/FB/Akamai আলাদা service, dates সহ)।

### Plan

#### 1. Shared utility `src/lib/bandwidthBilling.ts` (NEW)

একটাই source of truth যেটা buy + sell দুটোই use করবে:

```ts
export function daysInMonth(year, month1to12)  // 28/29/30/31
export function perDayCost(monthlyRate, totalDays)
export function lineAmount(mbps, monthlyRate, days, totalDays)
  // = mbps * monthlyRate * days / totalDays
export function buildSegments(subscription[], changeLog[], periodStart, periodEnd)
  // returns [{mbps, rate, segStart, segEnd, days, amount}]
export function totalBill(segments[])
```

**Example verification (user-এর scenario):**
- 1 Mbps × 200 × 15 / 30 = 100... wait, user বললেন 200 হবে।
- আসলে user-এর example: 1 Mbps for 15 days = 200 BDT (full month price for 1 Mbps, "যেহেতু পুরো MB-র দাম 200")
- কিন্তু formula অনুযায়ী 1 × 200 × 15/30 = **100**, not 200।

এটা একটা **conflict**। User-এর শেষের formal spec এই formula-ই বলেছে (`bill = X × per_day_cost × N` এবং example-এ 2 Mbps × 15 days = 100 BDT)। প্রথম paragraph-এর "পনেরো দিনের জন্যও দুইশ" সম্ভবত verbal slip — কারণ পরের লাইনেই বলেছেন "দুই MB price, পনেরো দিনের price হবে অর্ধেক মানে একশ টাকা" এবং final example-এও 200 + 100 = 300।

→ **Pro-rate formula = `mbps × monthly_rate × days / total_days_in_month`** ✓ (এটাই implement থাকবে)। Confirm করব first question-এ।

#### 2. Refactor `bwSaleProrate.ts` → use `bandwidthBilling.ts`

পুরোনো API-গুলো keep করব backward-compat-এর জন্য, ভেতরে শুধু shared util call করবে।

#### 3. BW Buy migration + UI (parity with BW Sale)

নতুন tables:
```
bw_buy_provider_subscriptions  (provider_id, service_id, mbps, rate_per_mbps, start_date, end_date, status)
bw_buy_service_change_log      (provider_id, service_id, old/new mbps & rate, effective_date)
bw_buy_bill_items              (bill_id, subscription_id, service_id, service_name, mbps, rate, period_start, period_end, days, total_days_in_month, amount)
```

Alter `bw_purchase_bills`: add `period_start`, `period_end`, `total_amount` (keep `amount` as alias for now).

UI:
- `bw-buy/Subscriptions.tsx` (NEW) — provider × service active subscriptions + upgrade/downgrade dialog
- `bw-buy/BillForm.tsx` rewrite — auto-pull provider's active subscriptions for selected month, preview line items
- `bw-buy/BillView.tsx` — show line items breakdown (image-77 layout)

#### 4. Self-test in code

`bandwidthBilling.ts` এর top-এ comment-এ user-এর exact example calc করব verification-এর জন্য:
```
// Verify: 1Mbps@200 for 15d + 2Mbps@200 for 15d (30-day month)
// = 1×200×15/30 + 2×200×15/30 = 100 + 200 = 300 ✓
```

Wait — recalc: 2 × 200 × 15 / 30 = 6000/30 = **200**, not 100। তাহলে total = 100 + 200 = **300** ✓ matches user!

User-এর "একশ" সম্ভবত verbal slip আবার, কিন্তু **final total 300 ঠিক আছে** formula দিয়ে। ✓

### Files

| File | Action |
|------|--------|
| `src/lib/bandwidthBilling.ts` | NEW — shared engine |
| `src/lib/bwSaleProrate.ts` | Refactor to use shared engine |
| `supabase/migrations/...` | NEW — BW Buy subscription/log/items tables |
| `src/pages/dashboard/bw-buy/Subscriptions.tsx` | NEW |
| `src/pages/dashboard/bw-buy/BillForm.tsx` | Rewrite — auto pro-rate from provider subscriptions |
| `src/pages/dashboard/bw-buy/BillView.tsx` | Show line items |
| `src/App.tsx` + `AppSidebar.tsx` | Route + menu for BW Buy → Subscriptions |

### Phasing

- **Phase A (এই loop):** `bandwidthBilling.ts` shared utility + refactor `bwSaleProrate.ts` + BW Buy DB migration + Subscriptions page + BillForm rewrite + BillView line items
- **Phase B (পরে):** Bulk monthly bill generation for buy side + edge function cron + provider statement reports

### Question

আগে পরের প্রশ্নের উত্তর confirm দরকার:

**Formula confirm**: `amount = mbps × monthly_rate × days / total_days_in_month` — এটাই use হবে কি? (User-এর example-এ 1 Mbps × 15 days = 100 BDT, 2 Mbps × 15 days = 200 BDT, total 300 BDT)। 

প্রথম paragraph-এ "পনেরো দিনেও দুইশ" বলেছিলেন যা formula-র সাথে match করে না, কিন্তু পরের formal spec ও final example-এ formula-ই ঠিক আছে। যদি confirm হয়, সরাসরি execute করব।

