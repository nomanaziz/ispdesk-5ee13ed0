

## লক্ষ্য
Tariff Type-এর `Date To Date` option-কে real behaviour দেওয়া — শুধু label না।

## বর্তমান অবস্থা
- `Tariff` form-এ `Custom` / `Date To Date` radio আছে কিন্তু behavior identical
- দুই type-এই Validity Days + Min Activation Days editable
- `AddClient`-এ `expire_day` (1–31) থেকে `computeExpireDate()` দিয়ে expire বের করা হয়
- Tariff type client save flow-এ কোথাও পড়া হয় না

## User-এর সংজ্ঞা
- **Custom** — admin-defined validity (e.g. 30 days, 60 days) এবং admin-defined minimum activation days
- **Date To Date** — client যেই তারিখে line শুরু করে / বিল দেয়, ঠিক পরের মাসের সেই তারিখে (বা ১ দিন আগে) line বন্ধ। Validity = Min Activation = (next billing date − today)। Variable, প্রতি client/মাসে আলাদা।

## পরিবর্তন

### ১. Tariff form (`src/pages/dashboard/branches/Tariff.tsx`)
- `Date To Date` selected হলে package row form-এ:
  - **Validity Days** এবং **Min Activation Days** input hide
  - Helper note: "Date-to-Date — validity client-এর billing date থেকে calculate হবে"
- Save-এর সময় date_to_date package rows-এ `validity_days = 0`, `min_activation_days = 0` (sentinel) save হবে
- Edit-এ open করলে date_to_date হলে inputs hide

### ২. Client expiry calculation (`src/pages/dashboard/clients/AddClient.tsx`)
নতুন helper যোগ:
```
computeExpireDateForTariff(billingDay, tariffType)
  - "custom" → existing logic (next occurrence of billingDay)
  - "date_to_date" → ঠিক পরের মাসের same day (যদি আজ < billingDay → এই মাসের billingDay; নাহলে next month)
```
আসলে দুটোর result সাধারণ ক্ষেত্রে same; পার্থক্য আসে যখন AddClient flow-এ tariff package fetch করে validity_days পড়ে use করে। Date-to-date হলে validity_days উপেক্ষা করে শুধু day-of-month → next billing date logic ব্যবহার হবে।

### ৩. Client tariff type detection
- AddClient + ClientList-এ যেখানে package selection হয়, সেখান থেকে `reseller_tariff_packages → reseller_tariffs.tariff_type` resolve করে cache করব
- `expire_date` সবসময় frontend `computeExpireDateForTariff()` থেকে আসবে (তাই backend invariant রাখা সহজ)

### ৪. Renewal / billing enforcement (edge functions)
দুটো জায়গায় expire_date renew হয়:
- `enforce-billing` — bill paid হলে expire_date বাড়ানো
- Bill receive flows (BillReceiveDialog ও related)

পরিবর্তন:
- Bill receive-এর সময় client-এর tariff type পড়া হবে
- `custom` → আগের মতই `expire_date += validity_days`
- `date_to_date` → `next expire = expire_date + 1 month` (same day-of-month, last-day clamp); validity_days লাগবে না

ফাইল scope:
- `src/components/billing/BillReceiveDialog.tsx`
- relevant bill collection / monthly billing edge function-এ একই logic mirror

### ৫. UI clarification
- Tariff dialog-এ `Date To Date` label-এর নিচে ছোট একটা inline note বাংলায়
- AddClient-এ expire_day field-এর label/hint update — date_to_date tariff selected থাকলে: "প্রতি মাসের এই তারিখে line বন্ধ হবে"

## যা **বদলাবে না**
- DB schema (already has tariff_type column)
- POP fund / billing balance flow
- Custom tariff-এর existing behavior
- Existing clients-এর data — শুধু future renewals affected

## Files to modify
- `src/pages/dashboard/branches/Tariff.tsx` — form conditional UI + save logic
- `src/pages/dashboard/clients/AddClient.tsx` — expire computation tariff-aware
- `src/components/billing/BillReceiveDialog.tsx` — renewal tariff-aware
- `supabase/functions/enforce-billing/index.ts` (review only — disable logic already date-based)
- যেখানে monthly bill generation expire_date বাড়ায় সেই edge function (যদি থাকে)

## Out of scope
- Per-client custom date_to_date override beyond billing day
- Pro-rata refund for early termination (already separate flow)
- UI for showing "tariff_type" badge in client list

approve করলে implementation শুরু করি।

