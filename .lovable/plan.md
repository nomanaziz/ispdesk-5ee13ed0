

## কাজ — POP Admin Reports (Admin reports-এর POP-scoped clone)

Admin-এর সব ৮টা report POP admin-এর জন্য তৈরি করব — হুবহু একই layout, একই filters, একই columns, একই export (PDF/CSV/Excel)। শুধু পার্থক্য: প্রতিটা query `branch_id = popScope.branchId` দিয়ে scoped — অন্য POP-এর কোনো data দেখা যাবে না।

### POP Reports list (৯টা page)

| # | Page | Route | Source admin file |
|---|---|---|---|
| 1 | Bill Collection | `/pop-admin/reports/bill-collection` | BillCollection.tsx |
| 2 | Customer | `/pop-admin/reports/customer` | Customer.tsx |
| 3 | Messages | `/pop-admin/reports/messages` | Messages.tsx |
| 4 | Due SMS | `/pop-admin/reports/due-sms` | DueSms.tsx |
| 5 | Processing Fee | `/pop-admin/reports/processing-fee` | ProcessingFee.tsx |
| 6 | Discount | `/pop-admin/reports/discount` | Discount.tsx |
| 7 | BTRC Monthly | `/pop-admin/reports/btrc` | Btrc.tsx |
| 8 | Financial | `/pop-admin/reports/financial` | Financial.tsx |
| 9 | Enable/Disable | `/pop-admin/reports/enable-disable` | নতুন (clients status changes) |

### Branch isolation strategy

প্রতিটা page `usePopScope()` থেকে `branchId` নেবে এবং Supabase query-তে filter যোগ করবে:

- **clients-based** (Customer, Discount via client.branch_id, BTRC, Enable/Disable): `.eq("branch_id", branchId)`
- **bill_collections-based** (Bill Collection, Processing Fee, Discount): client এর সাথে inner join করে client.branch_id দিয়ে filter — `.eq("client.branch_id", branchId)` (pg-rest filter on related table) অথবা সব row fetch করে client-side `client.branch_id === branchId` filter
- **sms_log-based** (Messages, Due SMS): যদি `branch_id` column থাকে use করব; না থাকলে recipient → clients table-এ branch match করে filter
- **income/expense (Financial)**: যদি `branch_id` থাকে use; না থাকলে POP `branch_funding_logs` থেকে fund credit/debit history দেখাব (POP-এর জন্য সেটাই relevant)

`branchId` undefined হলে empty rows return — accidental cross-POP leak রোধ।

### Sidebar update

বর্তমান sidebar-এ ৬টা link আছে। ৯টা করব (যোগ করব Customer, Processing Fee, BTRC, Financial; ইতোমধ্যে আছে: Bill Collection, Enable/Disable, Messages, Discount, Due SMS):

```
রিপোর্ট (Reports)
  ├─ বিল সংগ্রহ (Bill Collection)
  ├─ কাস্টমার (Customer)
  ├─ চালু/বন্ধ (Enable/Disable)
  ├─ মেসেজ (Messages)
  ├─ ডিউ এসএমএস (Due SMS)
  ├─ ডিসকাউন্ট (Discount)
  ├─ প্রসেসিং ফি (Processing Fee)
  ├─ বিটিআরসি মাসিক (BTRC Monthly)
  └─ আর্থিক (Financial)
```

### Reuse pattern

প্রতিটা POP report file admin file-এর hubohu copy, শুধু ৩ লাইন পরিবর্তন:
1. `import { usePopScope } from "@/hooks/usePopScope"` যোগ
2. component-এ `const { branchId } = usePopScope();` যোগ
3. প্রতিটা lookup query (zones, packages, sub_zones, boxes, affiliates) এবং main query-তে `.eq("branch_id", branchId)` chain যোগ; queryKey-তে `branchId` যোগ; `enabled: !!branchId` যোগ

`ReportLayout` + `reportExport` lib + `useSystemSetting` সবই reuse — কোনো নতুন infrastructure লাগবে না।

### Enable/Disable report (নতুন)

POP-এর জন্য client status change history। Source: `clients` table-এ `status_changed_at`, `mikrotik_status` fields, plus `bill_collections` থেকে disable/enable triggers। যদি dedicated audit table না থাকে: simply current snapshot — Active vs Inactive vs Left counts + filterable list।

Columns: SN | Client Code | Username | Name | Action (Enabled/Disabled) | Reason | Date | By

### ফাইল পরিবর্তন

**নতুন (৯টা):**
- `src/pages/reseller/reports/PopBillCollection.tsx`
- `src/pages/reseller/reports/PopCustomer.tsx`
- `src/pages/reseller/reports/PopMessages.tsx`
- `src/pages/reseller/reports/PopDueSms.tsx`
- `src/pages/reseller/reports/PopProcessingFee.tsx`
- `src/pages/reseller/reports/PopDiscount.tsx`
- `src/pages/reseller/reports/PopBtrc.tsx`
- `src/pages/reseller/reports/PopFinancial.tsx`
- `src/pages/reseller/reports/PopEnableDisable.tsx`

**Edit:**
- `src/App.tsx` — ৯টা route যোগ (`/pop-admin/reports/*`) under `<ResellerProtectedRoute require="reports">` (existing permission key reuse)
- `src/components/ResellerLayout.tsx` — sidebar reports section-এ ৩টা নতুন link যোগ (Customer, Processing Fee, BTRC, Financial)
- `src/components/ResellerProtectedRoute.tsx` — `require` prop type-এ `"reports"` যোগ (সাধারণ permissions key)

### কী বদলাবে না

- Admin dashboard reports — অপরিবর্তিত
- `ReportLayout`, `reportExport.ts`, `useSystemSetting` — reuse, কোনো edit নয়
- কোনো database schema পরিবর্তন নেই, কোনো migration নেই, কোনো edge function নেই
- অন্য POP-এর কোনো data কোনো POP দেখতে পাবে না (`branch_id` filter mandatory)
- BW customer / client portal — অপরিবর্তিত

### Apply-এর পরে expected ফলাফল

1. ✅ POP sidebar-এ "Reports" submenu-তে ৯টা item
2. ✅ প্রতিটা report Admin-এর সাথে UI/UX হুবহু same — filters, columns, totals, PDF/CSV/Excel export
3. ✅ POP-A logged in → শুধু POP-A-এর clients/bills/SMS দেখা যাবে; POP-B-এর কোনো data invisible
4. ✅ Sub-user (`reseller_sub`) যদি `permissions.reports = true` থাকে তবে দেখতে পাবে; নাহলে redirect
5. ✅ কোনো DB change নেই — pure frontend, instant deploy

