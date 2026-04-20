

## লক্ষ্য
দুটো কাজ একসাথে:
1. **URL rebrand**: `/reseller/*` → `/pop-admin/*` (legacy redirect সহ)
2. **404 fix + page wiring**: sidebar-এর ৪০+ menu item-এর জন্য POP-scoped page বানিয়ে route-এ wire করা — admin panel এর same feature reuse করে

## পরিবর্তনের সারসংক্ষেপ

### A. URL rebrand: `/reseller` → `/pop-admin`

| পুরাতন | নতুন |
|---|---|
| `/reseller/dashboard` | `/pop-admin/dashboard` |
| `/reseller/clients` | `/pop-admin/clients` |
| `/reseller/billing/list` | `/pop-admin/billing/list` |
| ... সব route ... | ... সব ... |

- `App.tsx`-এ সব `/reseller/*` route-কে `/pop-admin/*`-এ rename
- পুরাতন URL backwards compatibility-র জন্য redirect: `<Route path="/reseller/*" element={<Navigate to="/pop-admin/*" replace />} />`
- `ResellerLayout.tsx`-এর সব `to="/reseller/..."` → `to="/pop-admin/..."`
- POP login হলে redirect target: `/pop-admin/dashboard`
- File rename করব না (কোডের ভেতরে component-এর নাম `ResellerLayout` থাকবে — শুধু external URL change)

### B. Page wiring strategy

প্রতিটি sidebar menu item-এর জন্য — admin panel-এ existing page থাকলে সেটাই reuse করব, কিন্তু POP-scoped wrapper দিয়ে যাতে শুধু এই POP-এর `branch_id` data দেখায়।

**দুটো wrapping approach:**
1. **Simple config CRUD** (Zone, Box, etc.) — `PopScopedCrud` component already আছে, just import/route
2. **Complex pages** (Client list, Billing list, Reports) — নতুন lightweight wrapper page বানাবো যা admin page-এর key logic copy করে কিন্তু query-তে `.eq("branch_id", branchId)` filter বসায়

### C. নতুন/wired pages তালিকা

#### Configuration (৯টা — সব already exists কিন্তু route নাই)
- ✅ Zones, SubZones, Boxes, Packages, Districts, Upazilas, Departments, Designations — already created Phase 1
- 🆕 `PopDevices.tsx` — POP-scoped MikroTik device list

#### Employee (৫টা)
- 🆕 `PopAddEmployee.tsx`, `PopEmployees.tsx`, `PopSalarySheet.tsx`, `PopPayroll.tsx`, `PopAttendance.tsx`
- প্রতিটি `employees` table থেকে `.eq("branch_id", branchId)` দিয়ে data load করবে
- AddEmployee form: name, mobile, designation, department, salary, photo

#### Client (৫টা)
- 🆕 `PopAddClient.tsx` — client form (zone/sub-zone/package POP-scoped dropdown)
- 🆕 `PopClientList.tsx` — `clients` table filter by branch_id
- 🆕 `PopBillingClient.tsx` — billing-eligible clients
- 🆕 `PopLeftClients.tsx` — left status clients
- 🆕 `PopScheduler.tsx` — scheduled status changes

#### Billing (৪টা)
- 🆕 `PopBillingList.tsx` — `billing` table filter by branch_id
- 🆕 `PopInvoice.tsx` — invoice listing & view
- 🆕 `PopDailyCollection.tsx` — `bill_collections` filter by branch
- 🆕 `PopClientBillProfile.tsx` — per-client billing history

#### Monitoring (২টা — tickets already routed)
- 🆕 `PopOnlineClients.tsx` — online client monitoring filtered to branch
- 🆕 `PopPingTools.tsx` — ping/traceroute tool

#### SMS Service (৪টা)
- 🆕 `PopSmsTemplates.tsx`, `PopSmsIndividual.tsx`, `PopSmsSend.tsx`, `PopSmsGateway.tsx`

#### Reports (৬টা)
- 🆕 `PopBillCollectionReport.tsx`, `PopEnableDisableReport.tsx`, `PopMessagesReport.tsx`, `PopProcessingFeeReport.tsx`, `PopDiscountReport.tsx`, `PopDueSmsReport.tsx`

#### System (৩টা)
- 🆕 `PopCompanySettings.tsx` — POP company info edit (logo, address, contact)
- 🆕 `PopPeriodSetting.tsx` — bill generate day, due days (writes to `pop_billing_periods`)
- ✅ `ResellerUsers.tsx` already exists → rename usage to PopUsers

#### Fund History (২টা)
- 🆕 `PopCreditHistory.tsx` — `branch_funding` where trans_type ≠ refund
- 🆕 `PopDebitHistory.tsx` — `branch_funding` where trans_type = refund + bill deductions

### D. Common pattern প্রতিটি new page-এ

```tsx
const { customer } = usePortalAuth();
const { branchId, popId } = getPopScope(customer);

if (!branchId) return <NoBranchBanner />;

const { data } = useQuery({
  queryKey: ["pop-xxx", branchId],
  enabled: !!branchId,
  queryFn: async () => {
    const { data } = await supabase
      .from("xxx")
      .select(...)
      .eq("branch_id", branchId);
    return data || [];
  },
});
```

## কাজ ভাগ (এই sprint-এ ৩ batch-এ)

**Batch 1 — URL rebrand + Foundation pages (এই message-এ):**
- App.tsx এ সব route rename + legacy redirect
- ResellerLayout sidebar URL update
- PopDevices, PopAddEmployee, PopEmployees, PopAddClient, PopClientList, PopBillingClient, PopLeftClients, PopScheduler — ৮টা core operational page
- Login/Logout redirect target update

**Batch 2 — Billing + Reports (পরের message-এ):**
- PopBillingList, PopInvoice, PopDailyCollection, PopClientBillProfile
- ৬টা Report page

**Batch 3 — SMS + System + Fund History (পরের পরের message-এ):**
- ৪টা SMS page
- PopCompanySettings, PopPeriodSetting
- PopCreditHistory, PopDebitHistory
- PopOnlineClients, PopPingTools

## কী **হবে না**
- Existing admin (`/dashboard/*`) ERP module-এ কোনো change নেই
- Existing portal client (`/portal/*`) untouched
- পুরাতন `/reseller/*` URL ভাঙবে না — auto-redirect হবে
- DB schema change নেই (Phase 1-এর tables-ই ব্যবহার করব)

## File সংখ্যা (Batch 1)
- Modify: `App.tsx`, `ResellerLayout.tsx`, `PortalAuthContext.tsx` (login redirect)
- নতুন: ~৮টি `src/pages/reseller/pop-admin/` directory-তে page
- মোট Batch 1: ~১১ file edit/create

approve করলে Batch 1 শুরু করব।

