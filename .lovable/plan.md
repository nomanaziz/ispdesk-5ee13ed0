

## Searchable Dropdown — সব জায়গায় search box

### সমস্যা
সারা ERP-তে ১৭৩+ ফাইলে `Select` dropdown ব্যবহার হয়। অনেক জায়গায় (item, vendor, customer, package, employee, zone) ৫+ option থাকে — scroll করতে কষ্ট। যেমন Requisition page-এ "আইটেম" dropdown-এ শতাধিক item।

### সমাধান (এক ধাপে, পুরো codebase-এ)

#### ১. নতুন reusable component: `SearchableSelect`
ফাইল: `src/components/ui/searchable-select.tsx`

বৈশিষ্ট্য:
- **Drop-in replacement** — existing `<Select value onValueChange>` API-এর সাথে compatible, যাতে minimal change লাগে
- ভিতরে `Popover` + `Command` (ইতিমধ্যে available) ব্যবহার করে search সহ list
- **Auto-search threshold**: `searchThreshold` prop (default = **5**)। ৫ বা তার কম option হলে search box দেখাবে না — সাধারণ list থাকবে। ৫-এর বেশি হলে উপরে search input বসবে।
- Bangla + English উভয় text-এ search কাজ করবে (case-insensitive, accent-insensitive)
- `placeholder`, `disabled`, `className`, `emptyText` ("কোনো ফলাফল নেই") props
- Items দুইভাবে accept করবে:
  1. **Array prop**: `options={[{value, label, hint?}]}` — সবচেয়ে সহজ, একটাই tag লাগে
  2. **Children API**: existing `<SelectItem>`-এর মতো (legacy compatibility-র জন্য)
- Keyboard navigation (↑↓ Enter Esc) — Command primitive-এ built-in
- Mobile-friendly: viewport ছোট হলে full-width popover

ব্যবহার:
```tsx
<SearchableSelect
  value={form.item_id}
  onValueChange={(v) => setForm(p => ({...p, item_id: v}))}
  options={items.map(i => ({ value: i.id, label: i.name }))}
  placeholder="আইটেম নির্বাচন করুন"
/>
```

#### ২. Codebase migration strategy

**Approach: Targeted swap, না global blanket replace**
- শুধু সেই Select-গুলো replace হবে যেখানে options dynamic + likely 5+ (database থেকে আসা list)
- Static enums (status: pending/approved/rejected, payment method: cash/bkash) **অপরিবর্তিত** থাকবে — ওগুলোতে search দরকার নেই
- চিহ্নিত pattern: `{xxx.map((x) => <SelectItem ...>)}` যেখানে xxx একটা DB query result

**Sweep order (priority modules):**

1. **Purchase / Inventory** (most affected — user-reported)
   - Requisitions, Purchase Bills, Purchase Orders, Items, Vendors, Goods Receipts, Stock movements
2. **Billing / Customers**
   - BillEditDialog, Customer forms, Package selection, Invoice creation
3. **BW Buy** (recently built)
   - BillForm (provider, item, subscription dropdowns), Subscriptions, Items
4. **HR**
   - Employee forms (position, department, branch, designation), Attendance, Leave, Salary
5. **Network / OLT**
   - ONU assignment, OLT picker, Zone/SubZone/Box pickers, Customer↔ONU mapping
6. **Config pages** (ConfigCrudPage)
   - `ConfigCrudPage`-এর `type: "select"` field handler-এ `SearchableSelect` ব্যবহার করলে ১টা পরিবর্তনে SubZones, Boxes, ServiceTypes ইত্যাদি সব auto-cover হবে
7. **Reports filters** (PopBillCollection ইত্যাদি)
   - Zone, Sub Zone, Box, Package, Affiliator dropdowns
8. **Reseller / Branch / POP scoped pages**
   - Branch picker, POP picker, Reseller picker

**শুধু skip করা হবে:**
- Status filters ("all/pending/approved" — ৩-৪টা option)
- Payment method (cash/bkash/nagad — ছোট list)
- Yes/No, Active/Inactive toggles
- Month/year selectors

#### ৩. ConfigCrudPage centralized update
`src/components/config/ConfigCrudPage.tsx`-এ যেখানে `type: "select"` field render হয়, সেখানে `Select` → `SearchableSelect`। এতে Sub Zone, Box, Service Plan, Package, Service Type — সব config পেজ এক ফাইল পরিবর্তনে cover হবে।

#### ৪. বিশেষ provision
- **Loading state**: data load হওয়ার সময় "লোড হচ্ছে..." দেখাবে
- **Empty list**: "কোনো ফলাফল নেই" + (যেখানে relevant) "+ নতুন যোগ করুন" শর্টকাট button (optional, future)
- **Recent/favorites** (future scope, এই sprint-এ না): সর্বশেষ ব্যবহৃত ৩টা option উপরে pinned

### Files affected (estimate)

| Module | Files | Note |
|---|---|---|
| New component | 1 | `searchable-select.tsx` |
| ConfigCrudPage | 1 | covers ~20 config pages একসাথে |
| Purchase | ~6 | Requisitions, PO, GRN, Vendors, Items, Bills |
| Billing/Customers | ~10 | Customer/package/bill dialogs |
| BW Buy | ~4 | BillForm, Subscriptions, Items, Providers |
| HR | ~8 | Employee, Attendance, Leave, Salary |
| Network/OLT | ~6 | ONU, OLT, Zone pickers |
| Reports filters | ~10 | Zone/Box/Package filters |
| Branch/POP/Reseller | ~5 | scoped pickers |
| **Total** | **~50 files** | (১৭৩-এর মধ্যে শুধু dynamic-list dropdowns) |

### Out of scope (এই sprint-এ না)
- Static status/payment-method dropdowns
- Native `<select>` element (যদি কোথাও থাকে — পরে দেখা যাবে)
- Multi-select (এটা আলাদা feature, future plan)

### ফলাফল
- যেকোনো dropdown যেখানে ৫+ option আসছে — উপরে search input automatically
- Bangla টাইপ করেও খুঁজে পাওয়া যাবে
- Existing UI/look অপরিবর্তিত — শুধু search box যোগ
- ভবিষ্যতে নতুন কোনো dropdown বানালে শুধু `SearchableSelect` ব্যবহার করলেই default-এ ৫+ এ search পাবে

