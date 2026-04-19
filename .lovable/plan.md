

## Plan

### 1. POP Customers page (`Pop.tsx`) — simplify
- Remove "POP" column from the customer list table
- Remove "POP" dropdown field from the Add/Edit dialog (Step 1)
- Remove the unused `pops` state + fetching
- Add **auto-generate `customer_code`** on Add: derive from customer name short form (e.g. "Md Parbes Hassan" → "MPH" + 3-digit numeric suffix to keep unique). Code shown in form as read-only with a "regenerate" button; user can override. Purpose: bKash payment reference matching → enables auto-payment reconciliation later.
- Add **"Balance Due" column** + a "Total Due" footer row (matching the screenshot). Compute per-customer due as: `sum(invoices.amount) − sum(invoices.paid) − sum(invoices.discount)` from `bw_sales_invoices`.

### 2. Fix login "User inactive" bug
In `supabase/functions/portal-auth/index.ts` (BW Sale Customer branch), the check is:
```
if (bwCustomer.activity_status !== "Active")
```
But the admin form saves `"active"` (lowercase). Fix by case-insensitive compare:
```
if ((bwCustomer.activity_status || "").toLowerCase() !== "active")
```
Redeploy `portal-auth`.

### 3. Sales Invoices (`Invoices.tsx`) — Pay button on Due
- Add a **"Pay"** button next to invoices where `due > 0` (same pattern as home-user billing list).
- Reuse existing `ReceiveBillDialog` (already in `src/components/bw-sale/ReceiveBillDialog.tsx`) to record payment.
- After payment: status auto becomes `paid` if due == 0, otherwise `partial` (badge already differentiates Due/Paid; add Partial badge).

### 4. Recurring Invoices — verify only
Leave as-is; user said "আশা করি এটা কাজ করবে". No changes unless reported broken.

### Files to touch
- `src/pages/dashboard/bw-sale/Pop.tsx` — remove POP col/dropdown, add code auto-gen, add Balance Due column + total
- `src/pages/dashboard/bw-sale/Invoices.tsx` — add Pay button, Partial status
- `supabase/functions/portal-auth/index.ts` — case-insensitive active check
- (no DB migration needed — `customer_code` column already exists)

### Notes
- Code generation: take initials of words in customer_name, uppercase, append `-` + last 3 digits of `nextval`-style counter (client-side: count existing customers + 1, padded). Uniqueness ensured by retry on collision.
- Balance Due fetched in one query: `bw_sales_invoices` grouped by `customer_id` in JS after fetch.

