

## লক্ষ্য
**Prepaid POP** type-এর জন্য Billing List page-এ একটা নতুন **R.Days (Remaining Days)** column যোগ করা — যা client-এর `expire_date` থেকে আজকের দিন বাদ দিয়ে কত দিন বাকি আছে সেটা দেখাবে, এবং inline edit করে change করা যাবে।

## কোথায় দেখাবে
- **Page**: `/dashboard/billing` ও `/pop-admin/billing` (একই `BillingList.tsx` component)
- **Condition**: শুধু POP যার `pop_type = "prepaid"` সেই মোডে এই column দেখাবে। Postpaid POP বা Admin (non-POP) view-তে দেখাবে না।
- **Position**: "মেয়াদ" (Ex.Date) column-এর ঠিক পরে — screenshot-এর order মেনে।

## R.Days লজিক

```text
remainingDays = Math.ceil((expire_date - today) / 1 দিন)

Display:
  remainingDays > 7    → সবুজ pill, সংখ্যা দেখাবে (e.g., "19")
  1 ≤ days ≤ 7         → লাল pill, সংখ্যা দেখাবে (e.g., "1", "5")
  remainingDays = 0    → লাল pill, "0"
  remainingDays < 0    → লাল pill, "Expired"
  expire_date নেই      → "—"
```

## Edit flow (inline, Pop-up)
- R.Days pill-এ click → একটি ছোট popover খুলবে:
  - Number input: "নতুন R.Days" (default = current remaining)
  - "Save" button → server-এ `expire_date = today + newDays` set করে save
  - Cancel button
- Save সফল হলে toast + table refresh
- Validation: 0 বা positive integer; max 365

## পরিবর্তনের সুযোগ — POP type detect করা

`usePopScope` hook-এ বর্তমানে `pop_type` নাই। এটা যোগ করতে হবে:
- `PortalAuthContext` → POP login হলে customer object-এ `pop_type` (branches table থেকে) include করা
- `usePopScope` → `popType` return করা
- `BillingList` → `isPrepaidPop = isPopMode && popType === "prepaid"` দিয়ে column conditional render

বিকল্প (simpler): Login-এর সময় না এনে `BillingList`-এর initial query-তেই branch থেকে pop_type একবার fetch করা। এটা cleaner — আমি এই পদ্ধতিই ব্যবহার করব।

## পরিবর্তনের ফাইল

### 1. `src/pages/dashboard/billing/BillingList.tsx`
- Branch pop_type fetch করার ছোট useQuery (POP mode-এ)
- Table header: `<TableHead>` যোগ "R.Days" — শুধু `isPrepaidPop` হলে
- Table body: প্রতি row-এ remaining days calculate করে color pill — শুধু `isPrepaidPop` হলে
- Column count update (`colSpan={19}` → `20` prepaid POP-এ)
- Footer `colSpan` adjust

### 2. `src/components/billing/RemainingDaysCell.tsx` (নতুন ছোট file)
- Pill display + popover edit
- supabase update `expire_date` = `today + newDays`
- onSuccess: `queryClient.invalidateQueries(["billing-list"])`

## যা **বদলাবে না**
- Database schema — `expire_date` field already আছে, কোনো migration লাগবে না
- Postpaid POP ও Admin view — অপরিবর্তিত
- বাকি column, filter, pagination, bulk actions — intact
- POP package page (পূর্বের কাজ) — touch হবে না

## Files
- **Modified**: `src/pages/dashboard/billing/BillingList.tsx`
- **New**: `src/components/billing/RemainingDaysCell.tsx`

approve করলে default mode-এ গিয়ে এই ২টি file change apply করব।

