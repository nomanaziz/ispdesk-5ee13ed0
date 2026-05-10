## Goal

1. **Reseller portal থেকে BTRC Monthly Report সরাও** — শুধু Admin/Super Admin-এ থাকবে এবং সব reseller / single reseller filter সহ কাজ করবে।
2. **Reseller portal-এ Fund Recharge shortcut button** — TopBar (desktop) এবং Mobile home দুজায়গায়, যাতে যেকোনো জায়গা থেকে এক ক্লিকে fund recharge করা যায়।
3. **Credit History (Daily Charges) ঠিক রাখা** — যা reference image-এর মতো দেখায়: প্রতিদিন কতজন user-এর জন্য কত টাকা কাটছে (part-by-part daily, never monthly lump sum)।

## Changes

### A) BTRC Report — reseller থেকে সরাও, admin-এ filter add করো

- `src/components/portal-shell/ResellerSidebar.tsx` (line 97) — BTRC Monthly entry মুছে দাও।
- `src/App.tsx` —
  - `PopReportBtrc` lazy import (line 372) এবং route `/pop-admin/reports/btrc` (line 875) মুছে দাও।
- `src/pages/reseller/reports/PopBtrc.tsx` — file delete।
- `src/pages/dashboard/reports/Btrc.tsx` — admin filter বাড়াও:
  - নতুন **Reseller (POP)** dropdown: "All Resellers" + প্রতিটা active reseller (`branch_managers` থেকে fetch)।
  - query-তে যদি specific reseller select করা হয়, `clients.pop_id`/`branch_id` দিয়ে filter (current schema অনুযায়ী যেটা ব্যবহৃত হয়)। default = সব resellers (current behaviour)।

### B) Fund Recharge shortcut button (Reseller)

- `src/components/portal-shell/PortalTopBar.tsx` —
  - Reseller portal context-এ একটি ছোট **"+ Fund Recharge"** button (icon + label, lg+ এ label visible, mobile-এ icon only) `extra` slot-এর আগে render করো।
  - Click করলে `FundRechargeDialog` খুলবে। `popId`/`popName`/`branchId` `usePopScope()` থেকে নাও।
  - শুধু `customer?.type === "reseller"` হলে দেখাও (sub-user / bw_customer-এ না)।
- `src/pages/reseller/PopMobileHome.tsx` —
  - Top-এ একটি prominent **Fund Recharge** quick-action card/button (already there হলে verify, না থাকলে add)।
- Existing `FundRechargeDialog` (`src/components/branches/FundRechargeDialog.tsx`) reuse করব।

### C) Debit / Credit History pages — verify (no schema change)

`PopFundDebitHistory` (Debit Transactions) এবং `PopFundCreditHistory` (Credit / Daily Charges) ইতিমধ্যেই বিদ্যমান এবং reference image-এর columns ম্যাচ করছে। শুধু নিশ্চিত করব:

- Credit page-এ "Total Credited User" আজকের তারিখে কতজন user থেকে charge হয়েছে তা দেখাচ্ছে (already from `pop_daily_charges` distinct `client_id`)।
- Daily charges system part-by-part কাটছে (already implemented via `apply-pop-daily-charges` cron + 30-day prepaid wallet)। কোনো monthly lump sum নেই।
- Advance recharge (e.g. 30 days) করলে wallet থেকে সেই amount **reserve/debited** হয় এবং `pop_daily_charges`-এ আগামী days-এর entries pre-create হয় — এটা current `pop_recharge_client_days()` migration-এ যা করছে, তাই এখানে কোনো নতুন কাজ নেই, শুধু বর্তমান flow image-এর সাথে মেলে কি না verify করব।

## Out of scope

- New columns বা schema change লাগবে না।
- Admin-এর Fund History / accounting flow অপরিবর্তিত।

## Files touched

- delete: `src/pages/reseller/reports/PopBtrc.tsx`
- edit: `src/components/portal-shell/ResellerSidebar.tsx`, `src/App.tsx`, `src/pages/dashboard/reports/Btrc.tsx`, `src/components/portal-shell/PortalTopBar.tsx`, `src/pages/reseller/PopMobileHome.tsx`
