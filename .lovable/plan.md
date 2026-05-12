## Goal

Two fixes on the BW reseller portal:

1. **Pay Bill dialog** must show real payment gateways from admin settings — online gateways first (priority), manual gateways (bKash/Nagad personal, Bank) showing the receiving account number + Transaction ID + sender number fields.
2. **Service Orders** page must show the reseller's *current* services (from their active recurring/invoice) and allow per-service Upgrade / Downgrade / Discontinue requests, with a 30-day-minimum effective date for downgrade & discontinue.

No new tables — reuse existing schema.

---

## Part A — Pay Bill dialog (`src/components/reseller/PayBillDialog.tsx`)

### Behavior

- Load `system_settings.payment_gateways` (already used by admin) and split:
  - **Online** = `SSLCommerz`, `bKash Merchant`, `Nagad Merchant`, `RechargeServer` (any active one)
  - **Manual** = `bKash Personal`, `Nagad Personal`, `Rocket Personal`, `Bank Transfer`
- Show **Online section first** with a banner: *"দ্রুততম — সরাসরি পেমেন্ট"*. Each active online gateway = a primary button.
- Show **Manual section below** with header *"Online ব্যর্থ হলে নিচের যেকোনো একটিতে পাঠান"*. Each manual gateway shows its **receiving number** (from `gateway.fields.account_number` / `merchant_number` / `wallet_number`) with a copy button.
- When a **manual** method is selected, require:
  - Amount (prefilled with due)
  - Sender number (mobile from which money was sent)
  - Transaction ID
  - Optional note
  - Submit → `bw_sale_collections` row with `payment_method`, `note` containing TrxID + sender number, `status='pending'` (existing flow). Toast: *"Pending approval"*.
- When an **online** gateway is clicked:
  - `SSLCommerz` → invoke existing `sslcommerz-payment` edge function with `{ amount, invoice_id, customer_id }` and redirect to returned `gatewayPageURL`.
  - `bKash Merchant` → invoke `bkash-payment` with action `create`, redirect to `bkashURL`.
  - `Nagad Merchant` → invoke `nagad-payment`, redirect to `paymentURL`.
  - `RechargeServer` → invoke `rechargeserver-payment` and follow its return URL.
  - Persist a row in `public_payment_requests` (`billing_id` = reseller, `purpose='bw_invoice:<id>'`) so the existing `payment-callback` function can credit `bw_sale_collections` as approved on success.
- If **no online gateway is active**, hide the online section and show only manual.

### Files

- `src/components/reseller/PayBillDialog.tsx` — rewrite UI into two sections; add gateway loader hook.
- `src/hooks/usePaymentGateways.ts` *(new)* — small hook returning `{ online: [], manual: [] }` from `system_settings.payment_gateways`.

No DB migration needed.

---

## Part B — Service Orders (`src/pages/bw-customer/BwPurchaseOrders.tsx`)

### Behavior

- Load reseller's **current services** = `bw_sale_recurring_items` joined to active `bw_sale_recurring` for `pop_id = billingId` (status `active`). Each row = one service line (item_name, unit e.g. Mbps, current quantity, rate).
- Render a **"Current Order"** card listing each service:
  ```
  Bandwidth Internet · 160 Mbps · ৳18,000/mo   [Upgrade] [Downgrade] [Discontinue]
  ```
- Empty state only when truly no recurring service exists.
- Clicking an action opens the request dialog **prefilled with that service**:
  - **Upgrade**: new MB input (must be > current), effective date (default today, no minimum), note. Banner: instant after approval, prorated bill.
  - **Downgrade**: new MB input (must be < current), effective date with **min = today + 30 days** (calendar enforces and rejects earlier dates), note. Banner explains 30-day rule.
  - **Discontinue**: no MB input, effective date with **min = today + 30 days**, mandatory reason note. Banner warns service will stop on that date.
- Submit creates `bw_purchase_orders` row:
  - `request_type` = `upgrade` | `downgrade` | `discontinue`
  - `current_service_id` = recurring_item id
  - `effective_date`
  - `note` carrying `[TYPE] item_name: 160 → 100 Mbps` + user note
  - plus a single `bw_purchase_order_items` row capturing the requested quantity/unit so admin can read it cleanly.
- Below, keep the existing **All Orders** table (already works via `bw_purchase_orders` query). Add the request_type badge color for `discontinue` (red).

### Admin side (already exists)

`bw_purchase_orders` is rendered in the admin POP/BW area; the new `discontinue` value just needs to be displayed as another badge. No schema change — `request_type` is plain text.

### Files

- `src/pages/bw-customer/BwPurchaseOrders.tsx` — add current-services card, per-service action buttons, discontinue mode in dialog, calendar `min` date.
- (Optional) `src/pages/bw-panel/BwPanelPurchaseOrders.tsx` if it filters request_type — extend to show `discontinue`.

No DB migration needed.

---

## Out of scope

- Building admin approval UI for discontinue beyond status change (already handled by existing approve/reject on `bw_purchase_orders`).
- Real online-gateway credentials configuration (admin already has `PopPaymentGateways` page).
