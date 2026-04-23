

## Bandwidth Sale POP Customers — Login as Client + Password Regenerate + Invoice Drilldown

### সমস্যা ৩টা
১. **Login as Client** — `bw_customer` impersonate করলে home user (regular client) এর dashboard দেখাচ্ছে। কিন্তু এদের জন্য আমরা ইতিমধ্যে `/bw/dashboard` (5-page bandwidth customer portal) তৈরি করেছি — সেখানে redirect হওয়া উচিত।
২. **Password Regenerate** — `bw_customer` rows-এ password regenerate option নেই (POP-এর মতো)।
৩. **Invoice Number** — Bill list-এ invoice number শুধু text, clickable না। Click করলে সেই invoice-এর সব line items (কোন service, কত দাম) দেখা যাচ্ছে না।

---

### সমাধান

#### ১. Login as Client → Bandwidth Customer Portal-এ redirect

**File**: `supabase/functions/impersonate-portal-user/index.ts`
- `user_type = "bw_customer"` হলে JWT-তে full panel claims (`panel_access_enabled`, `panel_user_limit`, `panel_subscription_expires_at`, `panel_branch_id`) include করব
- Response-এ `redirect: "/bw/dashboard"` return করব (আগে `/pop-admin/dashboard` ছিল)

**File**: `src/lib/impersonate.ts` — কোনো change দরকার নেই (redirect server থেকে আসছে)

**File**: `src/pages/dashboard/BwSalePopCustomers.tsx` (বা যেখান থেকে "Login as Client" trigger হয়) — `loginAsUser("bw_customer", id)` already correct, শুধু server-side fix দরকার

#### ২. Password Regenerate Option for bw_customer

**Action menu-তে নতুন item যোগ**: `BwSalePopCustomers.tsx` page-এর row action menu-তে "Password Regenerate" button
- Existing `PasswordRegenerateDialog.tsx` pattern-এর মতো নতুন `BwCustomerPasswordDialog.tsx` তৈরি করব
- `bw_sale_customers` table-এর `password` (এবং optionally `username`) update করবে
- Random password generate option + copy button

#### ৩. Invoice Number Clickable + Line Items Drilldown

**File**: `src/pages/dashboard/BwSalePopCustomers.tsx` (POP customer profile-এর Invoice tab)
- Invoice number column-এ `<button>` wrap করব → click করলে modal/dialog খুলবে
- নতুন `BwInvoiceDetailDialog.tsx` তৈরি — যেটা দেখাবে:
  - Invoice header (number, date, month, customer)
  - **Line items table**: Service name, Bandwidth/Quantity, Unit price, Subtotal
  - Bottom: Total, Paid, Discount, Due
  - "Print PDF" button (existing print route reuse)

**Data source**:
- `bw_sales_invoices` (header) + `bw_sales_invoice_items` (lines) — যদি items table না থাকে, schema check করে নতুন migration লাগবে

---

### Files to Create/Modify

**New:**
- `src/components/bw-sale/BwCustomerPasswordDialog.tsx`
- `src/components/bw-sale/BwInvoiceDetailDialog.tsx`

**Modified:**
- `supabase/functions/impersonate-portal-user/index.ts` — `bw_customer` → `/bw/dashboard` + panel claims
- `src/pages/dashboard/BwSalePopCustomers.tsx` — Add "Password Regenerate" action + make invoice number clickable
- (If needed) Migration: confirm `bw_sales_invoice_items` exists with `service_name, qty, unit_price, subtotal` columns

---

### যা বদলাবে না
- Existing `/bw/*` portal pages, RBAC, layout
- Other customer types (reseller, reseller_sub) impersonation flow
- Invoice print/PDF route

### Outcome
- **Login as Client** → সরাসরি `/bw/dashboard` (5-item bandwidth portal) খুলবে — সঠিক context
- **Password Regenerate** → bw_customer-এর password/username instantly reset + copy
- **Invoice number click** → সুন্দর modal-এ সব service line items + amounts visible, সাথে print option

