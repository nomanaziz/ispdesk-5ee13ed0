
# Unify Portals — Design + Payments

দুইটা বড় কাজ এখানে আছে:

1. **Design unification** — Main admin portal এর নতুন design (Icons8/Hishabee custom icons, নতুন widget pattern, sidebar এর menu-link style) সব portal এ apply করা।
2. **Recharge/Payment system integration** — সব portal এ same payment methods, কিন্তু আলাদা accounting bucket।

কাজটা একসাথে করলে অনেক বড় হবে এবং ভুল হওয়ার risk বেশি, তাই step-by-step portal-by-portal এগোবো।

---

## Portal map

| # | Portal | Path | Layout file | Sidebar file |
|---|--------|------|-------------|--------------|
| 1 | Admin (main) — ✅ already done | `/dashboard/*` | `DashboardLayout.tsx` | `AppSidebar.tsx` |
| 2 | POP / Branch Manager (Reseller) | `/reseller/*` | `ResellerLayout.tsx` | `portal-shell/ResellerSidebar.tsx` |
| 3 | Bandwidth Buyer Panel | `/bw-panel/*` | `BwPanelLayout.tsx` | (inline) |
| 4 | Bandwidth Customer | `/bw-customer/*` | `BwCustomerLayout.tsx` | (inline) |
| 5 | End-user Portal (shared by admin's users, POP's users, BW reseller's users) | `/portal/*` | `PortalLayout.tsx` | `portal-shell/PortalSidebar.tsx` |

---

## Phase A — Design unification (one portal per step)

প্রতিটা portal এ একই কাজ:
- `lucide-react` extra icons বাদ দিয়ে main portal এর custom icon set (Icons8Icon / HishabeeIcon) ব্যবহার করা।
- Sidebar কে main portal এর মত menu-link pattern এ আনা (same collapse behavior, same spacing, same active state)।
- Dashboard widget গুলো main portal এর `KpiCard`, `MetricTile`, `ResourceGauge`, `InfoList`, `ImportantLinksSection` pattern এ migrate করা।
- TopBar / breadcrumbs / theme tokens main portal এর সাথে align করা।

### Step A1 — Reseller (POP / Branch Manager) portal
- `ResellerSidebar.tsx` rewrite → main `AppSidebar` এর menu-link structure follow করবে।
- `ResellerDashboard.tsx` widget গুলো main `Dashboard.tsx` এর pattern এ refactor।
- Icon swap (lucide → custom icons set)।

### Step A2 — Bandwidth Panel (`/bw-panel`)
- `BwPanelLayout.tsx` এর inline sidebar → `portal-shell` style এ extract করে main pattern এ।
- `BwPanelDashboard.tsx` widget refactor।

### Step A3 — Bandwidth Customer (`/bw-customer`)
- Same treatment as A2 for `BwCustomerLayout.tsx` + `BwDashboard.tsx`।

### Step A4 — End-user Portal (`/portal`)
- `PortalSidebar.tsx` + `PortalTopBar.tsx` কে main pattern এর সাথে fully align।
- `PortalDashboard.tsx` widget refactor।
- **Company info section**: portal owner অনুযায়ী contact info dynamic হবে —
  - Admin's user → admin company info (name fixed: GalaxyNet, contact = admin setup contact)
  - POP's user → POP manager এর setup contact
  - BW reseller's user → BW reseller এর portal-setup contact
  - এটা already partially আছে কি না check করে missing piece add করব।

---

## Phase B — Payment / Recharge unification

Main admin portal এ যে payment/recharge integration আছে, সেটাকে reusable করে সব portal এ plug করব।

### B1 — Shared payment module
- `src/components/payments/` এ shared components: `PayButton`, `RechargeDialog`, `PaymentMethodPicker`, `PaymentHistory` ইত্যাদি extract করা (যেগুলো main portal এ আছে সেগুলো থেকে)।
- সব gateway method (existing recharge server methods) একই module থেকে আসবে।

### B2 — Per-portal accounting buckets
নতুন/extended Supabase tables দরকার হবে যাতে প্রতিটা owner এর হিসাব আলাদা থাকে:
- `wallet_accounts (owner_type, owner_id, balance, currency)` — owner_type: `admin_user`, `pop_manager`, `bw_reseller`, `client`
- `wallet_transactions (wallet_id, type [credit/debit], amount, source [recharge/bill/manual], reference_id, gateway_txn_id, created_at)`
- RLS: প্রত্যেকে শুধু নিজের wallet/transactions দেখবে; admin সব দেখবে।

(Schema final করার আগে user এর কাছে confirm করব কোন owner কোন currency / minimum recharge amount allow করবে।)

### B3 — Plug into each portal
- **Admin's direct users** (`/portal`) → already has pay flow; verify + standardize।
- **POP managers** (`/reseller`) → "Recharge Fund" + bill এ "Pay Online" button।
- **BW resellers** (`/bw-panel`) → same — fund recharge + bill pay।
- **BW customers** (`/bw-customer`) → invoice এ "Pay Online" button।
- **Clients** (end-users in `/portal`) → already; ensure all gateways available।

### B4 — Accounting separation
- প্রতিটা successful payment ঠিক owner এর wallet এ credit হবে।
- Admin dashboard এ consolidated view (filter by owner_type)।
- POP / BW reseller dashboard এ শুধু নিজের ledger।

---

## Execution order

আমি এই order এ এগোবো এবং প্রতিটা step এর শেষে preview check করব:

1. A1 — Reseller portal design
2. A2 — BW Panel design
3. A3 — BW Customer design
4. A4 — End-user portal design + dynamic company info
5. B1 — Shared payment module extraction
6. B2 — Wallet/accounting schema migration (approval নিয়ে)
7. B3 — Plug payment into each portal
8. B4 — Per-owner ledger views

---

## Technical notes

- কোনো hardcoded color use করব না — শুধু `index.css` / `tailwind.config.ts` semantic tokens।
- Sidebar collapsed/expanded behavior, hover states, active indicator — main portal এর exact tokens।
- Icon migration এর সময় missing custom icon থাকলে `Icons8Icon` set এ add করব।
- Wallet schema multi-tenant safe — প্রতিটা row এ `tenant_id` থাকবে এবং RLS এ enforce হবে।
- Payment gateway secrets আগেই configured আছে কিনা `fetch_secrets` দিয়ে check করে নেব B1 এর আগে।

---

## Confirm before I start

আমি **Step A1 (Reseller portal design unification)** দিয়ে শুরু করতে চাই। Approve করলে এক এক করে সব step finish করব, প্রতিটা step এর পরে preview এ verify করে পরের টায় যাব।
