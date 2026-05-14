# Simplified BW POP Client Form

BW Panel reseller (`isBwPanel === true`) এই form-টা use করে নিজের POP-এর under-এ PPPoE end-user create করতে। কিন্তু এখন `AddClient.tsx` admin-এর সব heavy field দেখায় — Client Type, Connection Type, multiple admin-config dropdowns, district/upazila editor — যা BW POP-এর জন্য irrelevant। এর ফলে "Protocol Type Missing", "Billing Status Missing" warning আসে, কারণ BW Panel admin-এর config tables ছোঁয় না।

## লক্ষ্য

BW Panel mode-এ form-কে শুধু POP-এর জন্য দরকারি field-এ সীমিত করা। Admin / Reseller (tariff-based) form unchanged থাকবে।

## Scope (শুধু `isBwPanel === true` হলে)

### দেখাবে (essential only)
- Client Name *
- Mobile *
- Client Code (auto-generate, editable)
- PPPoE Username *
- Password *
- Zone * (POP-এর own zones)
- Package * (POP-এর own packages)
- MikroTik Server * (POP-এর own servers)
- Profile (package থেকে auto, editable)
- Monthly Bill * (package থেকে auto)
- Joining Date
- Address (optional, single-line)
- NID (optional)
- Remarks (optional)

### লুকাবে
- Client Type dropdown
- Connection Type dropdown
- Protocol Type dropdown → background-এ default `"PPPoE"` set হবে
- Billing Status dropdown → background-এ default `"Active"` set হবে
- Branch selector (POP-এর `branch_id` auto)
- District / Upazila / Division (POP profile থেকে auto)
- Employee/assigned-to dropdown
- Sub-zone, Box (optional — POP চাইলে পরে edit করতে পারবে)
- "Missing config" warning banner (line 593) — BW Panel-এ irrelevant
- Checklist banner (line 603-onwards) — BW Panel mode-এ পুরো hide

## Technical changes

File: `src/pages/dashboard/clients/AddClient.tsx`

1. **Default values** — initial form state-এ `isBwPanel` হলে `protocol_type: "PPPoE"`, `billing_status: "Active"` set করো।
2. **Validation** (`handleSubmit`, ~line 321-355) — `isBwPanel` হলে protocol_type / billing_status / client_type / connection_type / mikrotik_id-এর required check skip বা auto-fill করো (mikrotik server টা required রাখব, কারণ PPP create করতে লাগে)।
3. **Render guards** — প্রতিটা hide-list field-এর JSX block-কে `{!isBwPanel && (...)}` দিয়ে wrap করো:
   - Client Type, Connection Type, Protocol Type, Billing Status select blocks
   - District / Upazila / Division readonly inputs (line ~764-795)
   - Employee/assigned-to block
   - Sub-zone / Box selects
4. **Warning banner** (line 593) — condition থেকে `!isBwPanel` add করা আছে, ঠিক আছে।
5. **Checklist banner** (line 603) — condition `{isPopMode && !isBwPanel && (...)}` করো, যাতে BW Panel-এ চেকলিস্ট পুরো না দেখায় (BW Panel-এর জন্য কোনো admin-config dependency নেই)।
6. **Header** — `isBwPanel` হলে title `"নতুন ক্লায়েন্ট যোগ করুন (BW POP)"` দাও, যাতে clear হয় simplified form।

## Out of scope

- Admin / regular reseller (tariff-based) form-এ কোনো change নাই।
- `QuickCreateClientDialog` already simple — ছোঁব না।
- Database schema / RLS / portal API — কোনো change নাই, শুধু UI।
- Checklist collapsed behavior (admin/reseller-এর জন্য) — আগের সিদ্ধান্ত অনুযায়ী আলাদা করে handle হবে, এই plan-এ নয়।

## QA

- BW Panel session-এ `/bw/panel/clients/add` খুললে শুধু simplified field দেখা যাবে, কোনো warning/checklist থাকবে না।
- Form submit করলে backend-এ `protocol_type=PPPoE`, `billing_status=Active`, `branch_id=<POP branch>` সঠিকভাবে যাবে।
- Admin `/dashboard/clients/add` এবং reseller `/pop-admin/clients/add` form আগের মতোই full থাকবে।
