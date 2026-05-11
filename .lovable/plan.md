# BW Reseller Panel — Mirror Main Admin Sidebar (Reduced Scope)

## Concept

A Bandwidth Reseller is a "mini admin": they buy bandwidth from us, then run their own ISP on our portal — own MikroTiks, own packages/profiles, own clients, own billing, own monitoring. The BW panel must look and work like the main Admin portal — same module groupings, same UX patterns — only with fewer modules (because a BW reseller has 500–1000 users, not 50–70k, and 2–3 employees, not a full HR org).

This is **independent from the POP/MAC reseller portal**. They share underlying admin pages (already POP-scoped via `usePopScope()`), but the BW sidebar/menu must NOT be derived from or mixed with the MAC reseller layout.

## What the BW Panel Sidebar Should Look Like

Mirror the Admin sidebar, but only the groups/items below. Order follows the main admin pattern (Dashboard → Clients → Billing → Support → Accounting → HR → OLT → Network → Device → Reports → SMS → Configuration → Settings).

### Groups & items

**ড্যাশবোর্ড** — Dashboard

**ক্লায়েন্ট** (All Clients style, trimmed)
- নতুন রিকোয়েস্ট
- হোম ক্লায়েন্ট
- কর্পোরেট ক্লায়েন্ট
- বিলিং তালিকা
- দৈনিক বিল কালেকশন
- ইনস্টলেশন ফি
- চলে যাওয়া ক্লায়েন্ট
- শিডিউলার
- ক্লায়েন্ট যোগ
- বাল্ক ইম্পোর্ট

**সাপোর্ট ও টিকেটিং**
- ক্লায়েন্ট সাপোর্ট
- সাপোর্ট হিস্টরি
- নোটিশ

**অ্যাকাউন্টিং (basic)** — Income, Expense, Cash Book *(no full chart-of-accounts / journal / trial balance / P&L compare — too heavy for a 500-user reseller)*

**HR (basic)** — কর্মচারী যোগ, কর্মচারী তালিকা, বেতন শীট *(no shifts, ZKTeco, leave, attendance rules, resign rules — only 2–3 staff)*

**OLT ম্যানেজমেন্ট** (full — per screenshot)
- OLT / ONU ওভারভিউ, OLT ডিভাইস, OLT Power Dashboard, ONU তালিকা, OLT ইউজার, OLT Port Classification, ইউজার ডাউন কাউন্ট, ফাইবার ডাউন ফাইন্ডার, OLT শেয়ারিং

**নেটওয়ার্ক মনিটরিং** (per screenshot)
- অনলাইন মনিটরিং, Live Traffic, Switch ম্যানেজমেন্ট, POP DASS, POP IP, POP লগ, Ping টুলস, POP ডিভাইস

**ডিভাইস** (per screenshot)
- ড্যাশবোর্ড, ডিভাইস ইনভেন্টরি, MikroTik PPPoE, MikroTik ইউজার (existing)

**রিপোর্ট (basic)** — বিল কালেকশন, কাস্টমার রিপোর্ট, আর্থিক

**SMS সার্ভিস** — টেমপ্লেট, পাঠান, গেটওয়ে *(already wired)*

**কনফিগারেশন** (per screenshot, full)
- জোন, সাব জোন, বক্স, কানেকশন টাইপ, ক্লায়েন্ট টাইপ, প্রোটোকল টাইপ, বিলিং স্ট্যাটাস, প্যাকেজ, এলাকা (বিভাগ/জেলা/উপজেলা), সার্ভিস টাইপ, বিভাগ, পদবী, ডিভাইস টাইপ

**সেটিংস** — কোম্পানি সেটিংস

### Explicitly excluded (admin has them, BW doesn't need)
POP / MAC ক্লায়েন্ট group · ব্যান্ডউইথ ক্লায়েন্ট (sale-side) · ব্যান্ডউইথ ক্রয় · ই-কমার্স · ক্রয় · বিক্রয় ও সার্ভিস (full) · ইনভেন্টরি (full multi-store) · অ্যাসেট · ইভেন্ট ও ছুটি · ওয়েবসাইট প্যানেল · টাস্ক ম্যানেজমেন্ট · নেটওয়ার্ক ডায়াগ্রাম · সিস্টেম · VAS · Full HR (shifts/payroll/attendance/leave) · Full Accounting (journal/balance-sheet/P&L compare/trial balance)

## Implementation

1. **Rebuild `panelGroups` in `src/components/BwCustomerLayout.tsx`** to the structure above. Order, labels, and icons must mirror `menuGroups` from `src/components/AppSidebar.tsx`.
2. **Add the missing wrappers in `src/pages/bw-panel/wrappers.ts`** (re-export existing admin pages — they're already POP/branch-scoped via `usePopScope()`):
   - Clients: `NewRequest`, `HomeClients`, `CorporateClients`, `InstallationFee`, `ChangeRequest`
   - Support: `Tickets`, `SupportHistory`, `Notices`
   - OLT (full set under `/dashboard/olt*`)
   - Monitoring (full set under `/dashboard/monitoring/*`, `/dashboard/network/switches`)
   - Device Admin (`/dashboard/device-admin*`, `/dashboard/mikrotik/servers`)
   - Config: `ConnectionTypes`, `ClientTypes`, `ProtocolTypes`, `BillingStatuses`, `Locations`, `ServiceTypes`
   - Reports: `Discount` excluded; keep `BillCollection`, `Customer`, `Financial`
3. **Register routes in `src/App.tsx`** under `/bw/panel/*` for every new wrapper, all wrapped in `PortalAuthProvider → BwPanelProtectedRoute → BwCustomerLayout`. Use the same path suffixes as admin (e.g. `/bw/panel/olt`, `/bw/panel/monitoring/online`, `/bw/panel/config/connection-types`).
4. **Scope safety check**: verify each newly wrapped admin page reads its branch from `usePopScope()` (not directly from a global admin context). Pages that bypass scope must be patched to honor `isBwPanel` + `branchId` before being exposed.
5. **No changes** to MAC reseller portal (`ResellerSidebar.tsx`) — BW and MAC stay independent.

## Out of Scope (separate tickets)

- Per-BW-reseller package isolation in `isp_packages` (needs `owner_branch` migration).
- Sub-reseller hierarchy under a BW reseller.
- Trimming module-internal sub-features (e.g. hiding "advanced" tabs inside reused admin pages).

## Validation

- BW panel sidebar visually matches uploaded screenshots for Configuration, Device, Network Monitoring, OLT.
- Every menu item navigates to a working page rendered inside `BwCustomerLayout`.
- Active highlight + auto-open group works for every new route.
- MAC reseller portal sidebar unchanged.
