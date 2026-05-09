# Remove Prepaid/Postpaid POP Type Distinction

## Goal

POP-এর `prepaid` vs `postpaid` দ্বিধা সম্পূর্ণ সরিয়ে দেওয়া। সব POP একই ধরনের — শুধু balance-ভিত্তিক একটা unified flow থাকবে। (নতুন logic পরে user দেবেন; এই plan শুধু পুরোনো logic clean করবে।)

**Note:** `branch_managers.pop_type` কলামটা `'bandwidth'` এবং `'reseller_sub'` value-এর জন্যও ব্যবহৃত হয় — এই দুটো ভিন্ন concept, তাই কলাম রাখা থাকবে; শুধু `'prepaid'` / `'postpaid'` value ও তার চারপাশের branching সরবে।

## Changes

### 1. UI — POP create/edit form
**`src/components/branches/PopForm.tsx`**
- POP Type dropdown (Prepaid Daily / Postpaid Monthly) সরিয়ে দাও।
- `form.pop_type`, related validation, conditional `min_balance`/`auto_disable_day`/`fund_started` branching সব সরাও।
- Insert payload থেকে `pop_type`, `allow_negative_balance` (postpaid-derived), `auto_disable_day` (conditional) সরাও — অথবা সব POP-এর জন্য neutral default রাখো (`pop_type: null`, `allow_negative_balance: false`, `auto_disable_day: 10`)।

### 2. Admin POP listings & profile
**`src/pages/dashboard/branches/Managers.tsx`**
- `filterPopType` (Prepaid/Postpaid select) সরাও।
- Toggle button "switch prepaid↔postpaid" সরাও।
- Badge column থেকে `pop_type` display সরাও।

**`src/pages/dashboard/branches/PopProfile.tsx`**
- Prepaid/Postpaid badge ও related conditional sections (lines 129, 171, 193, 205, 235, 241, 244) সরাও।

**`src/pages/dashboard/branches/PgwTransactions.tsx`**
- Prepaid/Postpaid filter ও badge column সরাও।

### 3. Dashboard widgets
**`src/pages/Dashboard.tsx`** — `pop_type` reference গুলো রাখো শুধু `'bandwidth'` filter-এর জন্য; prepaid/postpaid grouping সরাও।

### 4. Billing & client lists
**`src/pages/dashboard/billing/BillingList.tsx`** — `isPrepaidPop` branch ও R.Days column সবার জন্য default করে দাও (অথবা সবসময় hide); prepaid-only display সরাও।

**`src/components/branches/PopLeftClientsTab.tsx`** — "prepaid POP হলে refund হবে" hint থেকে "prepaid" শব্দ সরাও (সব POP-এর জন্য একই behaviour assume করো)।

**`src/components/branches/FundDeductionDialog.tsx`** — type থেকে `pop_type` সরাও।

**`src/components/mikrotik/TransferToPopDialog.tsx`** — `selectedPop.pop_type === "prepaid"` based balance-check guard সরিয়ে সবসময় balance check করো।

### 5. Reseller portal mobile
**`src/components/reseller/mobile/ResellerMobileShell.tsx`** — `popType.toLowerCase() === "prepaid"` based UI branch সরাও।

### 6. Notice & overview
**`src/pages/dashboard/support/Notices.tsx`** — `regularPops`/`bwPops` split-এ `pop_type !== "bandwidth"` যথাযথ; কোনো prepaid/postpaid filter থাকলে সরাও।
**`src/pages/dashboard/CompanyOverview.tsx`** — `eq("pop_type", "bandwidth")` রাখো (bandwidth POP আলাদা); prepaid/postpaid কিছু থাকলে সরাও।

### 7. Edge functions
**`supabase/functions/enforce-billing/index.ts`** — postpaid-specific block (lines 257-315: `auto_disable_day` window, "skipped_postpaid_*") সরিয়ে সব POP-এর জন্য একই enforcement রাখো।

**`supabase/functions/apply-pop-daily-charges/index.ts`** — `.eq("pop_type", "prepaid")` filter সরাও; সব POP-এ daily charges apply হোক (অথবা পুরো function disable করার সিদ্ধান্ত পরে নেওয়া হবে — এখন filter শুধু সরাচ্ছি)।

**`supabase/functions/portal-auth/index.ts` & `portal-data/index.ts`** — `pop_type` field pass করা থামানোর দরকার নেই (sub-user identification-এ ব্যবহৃত), শুধু prepaid/postpaid value আসছে এমন assumption যেখানে আছে সেখান থেকে সরাও — UI consumer-এ already হ্যান্ডেল হবে।

### 8. Recent migration cleanup
**নতুন migration:**
- `public.charge_pop_for_client_activation` function update: `IF COALESCE(v_pop.pop_type, 'prepaid') <> 'prepaid' THEN RETURN` চেক সরাও — সব POP-এ balance check + deduction প্রযোজ্য হবে। `allow_negative_balance` exemption থাকবে।
- `public.process_credit_refund_on_client_left` function update: `v_pop.pop_type <> 'prepaid'` চেক সরাও।
- `public.enforce_pop_type_daily_limit` trigger ও function drop করো (একই দিনে pop_type পরিবর্তনের নিয়ম আর লাগবে না)।

### 9. Types
`src/integrations/supabase/types.ts` auto-generated — touch করব না।

## Out of scope

- `pop_type` কলাম drop করা হবে না (`'bandwidth'`, `'reseller_sub'` value এখনও ব্যবহৃত)।
- নতুন billing logic — user পরে দেবে।
- Database থেকে existing 'prepaid'/'postpaid' value clear করা: optional one-shot UPDATE (`SET pop_type = NULL WHERE pop_type IN ('prepaid','postpaid')`) — confirmation চাইব implementation-এর সময়।

## Files touched (summary)

- 1 new migration
- 13 frontend files (form, list, profile, dashboard, billing, dialogs, notices, mobile shell)
- 3 edge functions (enforce-billing, apply-pop-daily-charges, portal-auth/data — minimal)
