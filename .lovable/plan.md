

## BW Sale Customer Portal — সঠিক Routing & Data Wiring

### সমস্যা

`bw_sale_customers` table-এ থাকা demo account login করলে `portal-auth` `type: "bw_customer"` return করছে → Login.tsx switch-এ default case → `/portal/dashboard` (client UI) এ চলে যাচ্ছে। কিন্তু image-73→81 অনুযায়ী এদের `/reseller/*` layout-এই যাওয়ার কথা (যেখানে Dashboard, Billing Invoices, Purchase Orders, Tickets, Users, Settings আছে)।

পাশাপাশি `ResellerLayout`/`ResellerProtectedRoute` শুধু `type === "reseller" || "reseller_sub"` allow করে — BW customer block হচ্ছে।

আর Dashboard/Invoices/Purchases page গুলো `customer.sub` (id) দিয়ে query করছে — কিন্তু `bw_sales_invoices.customer_id` BW customer-এর id, এটা ঠিক কিন্তু `bw_purchase_orders.reseller_id` field actually BW customer-এর id ও হতে পারে (দুই type একই table share করছে — verify করব)।

### Fix Plan

**1. `Login.tsx` — `bw_customer` কে reseller dashboard-এ পাঠাও**

```ts
case "reseller":
case "reseller_sub":
case "bw_customer":      // ← add
  navigate("/reseller/dashboard", { replace: true });
  break;
case "client":
default:
  navigate("/portal/dashboard", { replace: true });
```

**2. `ResellerProtectedRoute.tsx` — `bw_customer` allow করো**

```ts
const allowed = ["reseller", "reseller_sub", "bw_customer"];
if (!allowed.includes(customer.type)) return <Navigate to="/portal/dashboard" replace />;
```

**3. `ResellerLayout.tsx` — BW customer-এর জন্য Users menu hide**

BW Sale Customer-এর sub-user feature এখন নেই (only branch_managers এর আছে)। তাই sidebar-এ `users` menu শুধু `reseller`/`reseller_sub`-এর জন্য দেখাও।

**4. `portal-auth` edge function — sub-user login support BW customer-এর জন্যেও** (পরে — Phase 2)

এখন শুধু parent account ঠিক করব।

**5. Reseller pages-এ data source fix**

বর্তমানে সব page `customer.parent_reseller_id || customer.sub` use করছে যেটা reseller-এর জন্য correct। BW customer-এর জন্যও `customer.sub` = `bw_sale_customers.id`, এবং invoices ইতোমধ্যে `customer_id` দিয়ে filter হচ্ছে — verify করে যেখানে দরকার ঠিক করব:

| Page | Query column | Status |
|------|------|--------|
| `ResellerInvoices` | `bw_sales_invoices.customer_id = sub` | ✓ |
| `ResellerInvoiceDetail/Print` | join already correct | ✓ |
| `ResellerDashboard` | invoices: `customer_id`; orders: `reseller_id` | orders ক্ষেত্রে BW customer-এর id হওয়া উচিত — verify |
| `ResellerPurchaseOrders/Form` | `bw_purchase_orders.reseller_id` | একই — BW customer-এর id ব্যবহার হবে |
| `ResellerTickets` | `support_tickets.source = 'bw_reseller'` + `created_by_id = sub` filter add | filter add |
| `ResellerSettings` | `bw_sale_customers` row update | `branch_managers` থেকে switch করব BW customer হলে |
| `ResellerUsers` | hide for `bw_customer` (Phase 2-এ enable) | hide |

**6. `ResellerSettings.tsx` — type-aware update**

```ts
const table = customer.type === "bw_customer" ? "bw_sale_customers" : "branch_managers";
const nameField = customer.type === "bw_customer" ? "customer_name" : "name";
```

### Files to change

| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Add `bw_customer` → `/reseller/dashboard` |
| `src/components/ResellerProtectedRoute.tsx` | Allow `bw_customer` type |
| `src/components/ResellerLayout.tsx` | Hide Users menu for `bw_customer` |
| `src/pages/reseller/ResellerDashboard.tsx` | Use `customer.sub` for both invoices.customer_id and orders.reseller_id (already does) — just verify |
| `src/pages/reseller/ResellerTickets.tsx` | Add `created_by_id = customer.sub` filter so each customer sees only their own tickets |
| `src/pages/reseller/ResellerSettings.tsx` | Branch on `customer.type` to read/write correct table |
| `src/pages/portal/PortalDashboard.tsx` (and other `/portal/*`) | **No change** — user বললেন client portal এখন touch করতে হবে না |

### কী ঘটবে login-এর পর

- BW Sale Customer (যেমন আপনার demo) → `/reseller/dashboard` → image-73 layout (dark navy sidebar, 6 stat cards, Welcome card)
- Branch Manager (POP reseller) → একই `/reseller/dashboard` (আগের মতই)
- Client (PPP user) → `/portal/dashboard` (untouched)
- Admin (email) → `/dashboard` (untouched)

### Phase 2 (এখন না)

- BW Sale Customer-এর sub-user টেবিল (`bw_reseller_users` analogue) + permission tree
- Image-77 অনুযায়ী invoice line-items-এ Internet/PNI/GCC service breakdown (এখন `bw_sales_invoices` এ items table আছে কিনা check করতে হবে — না থাকলে migration)

