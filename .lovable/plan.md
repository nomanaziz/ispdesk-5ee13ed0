## ১. Clear Filter বাটনের সমস্যা

**বর্তমান অবস্থা** (`src/pages/dashboard/mikrotik/Import.tsx`):
`clearFilters()` শুধু server / protocol / profile / userType / search reset করে, কিন্তু:
- `transferStatus` (Pending/Transferred) reset হয় না
- `selectedIds` (চেকবক্স selection) clear হয় না
- সব filter ইতিমধ্যে default ("all") থাকলে button চাপলে দৃশ্যত কিছুই হয় না — তাই মনে হয় "কাজ করছে না"

**সমাধান**:
- `clearFilters()` এর সাথে `transferStatus` কে `"pending"` এ reset + `selectedIds` clear যোগ
- Button কে disable করা হবে যখন সব filter ইতিমধ্যে default — যাতে clear করার মতো কিছু না থাকলে চাপ দিলে inactive বোঝা যায়
- Hover এ tooltip: "সব filter, search ও selection clear করুন"

## ২. Export to POP/Reseller dialog — issue grouping ও protocol validation

**বর্তমান গ্যাপ** (`src/components/mikrotik/TransferToPopDialog.tsx`):
- শুধু profile mismatch ধরা হয়, কিন্তু `service = "any"` / `dhcp` / `hotspot` ইত্যাদি non-PPPoE protocol আলাদা ভাবে detect/block হয় না
- কোন user-এ কী সমস্যা সেটা চেনার উপায় নেই — শুধু aggregate count দেখানো হয়

**নতুন behavior**:

### Validation rule
শুধু `service === "pppoe"` (case-insensitive) allowed। অন্য সব (`any`, `dhcp`, `hotspot`, null) → "Protocol mismatch" issue হিসেবে flag।

### "User Issues" নতুন section (auto-match table-এর নিচে)
শুধু সেইসব user দেখাবে যাদের অন্তত একটা issue আছে। গ্রুপিং hierarchy:

```text
Issues Summary
─────────────────────────────────────────
[▶] Profile mismatch — 2 user
       40Mb ......................... 2
[▶] Protocol mismatch (PPPoE নয়) — 1 user
       any ........................... 1
```

- **Top level**: issue type (Profile mismatch / Protocol mismatch) — by default **collapsed**, count + badge দেখাবে
- **Expand করলে**: ওই issue-এর under সব affected profile/protocol value, সাথে user count
- **আরও expand (sub-row) করলে**: actual user list (username, profile, service) — যাতে কোন কোন user সেটা দেখা যায়
- একই user-এ একাধিক issue থাকলে দু'জায়গায় উভয় section-এ দেখাবে (clarity-র জন্য)

### Block / allow behavior
- `unmatchedCount` (profile) **বা** `protocolMismatchCount` > 0 → Export button disabled
- Existing red alert text update হয়ে দুটো issue type-ই উল্লেখ করবে: "X জন user-এর profile mismatch, Y জন user PPPoE নয় — আগে MikroTik-এ ঠিক করুন বা POP-এর tariff-এ package add করুন"
- Per-day debit / total monthly হিসেব শুধু **valid users** (PPPoE + matched profile) থেকে হবে

### Data fetched
`selectedRows` query-তে `service` field যোগ করতে হবে (এখন শুধু `id, name, profile` আসছে)।

## Technical notes

- `useMemo`-এ user-level issue list build: `{ user, issues: ["profile_mismatch" | "protocol_mismatch"] }[]`
- Collapse UI: shadcn `<Collapsible>` ব্যবহার, কোনো নতুন dependency দরকার নেই
- কোনো DB schema change নেই — শুধু frontend logic

## Out of scope
- Server-side validation (existing client-side check + unique constraint যথেষ্ট)
- Auto-fix protocol from dialog (user MikroTik-এ গিয়ে ঠিক করবে — current pattern অনুযায়ী)