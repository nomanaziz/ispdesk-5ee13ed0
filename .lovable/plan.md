
User wants 3 connected things for the e-commerce flow:

1. **Logged-in client checkout autofill** — if a portal user is logged in, prefill name/mobile/address from their client record. Default to COD. No need to fill big form.
2. **Admin can create product invoice for any client** — from admin portal, pick client + product → generate order/invoice on their behalf. Use existing `ProductInvoice.tsx` page but tie it to `shop_orders` so warranty/order status flow works.
3. **Portal-side shop** — let logged-in clients browse & order from inside their portal (no need to visit public site).
4. **Order status workflow** — pending → processing → done → completed. On "completed/paid", warranty auto-activates (already exists via `activate_warranty_on_paid` trigger).

## Plan

### Part A — Checkout autofill for logged-in portal users
Edit `src/pages/public/Checkout.tsx`:
- Read `usePortalAuth()` to detect logged-in client
- If logged in → fetch client from `clients` table (name, mobile, email, address, district, thana)
- Auto-prefill form, collapse it into a compact "আপনার তথ্য" card with "Edit" button
- Force `payment_method = "cod"` by default (still allow change)
- Store `client_id` on the order (need new column)

### Part B — Link orders to clients
**Migration:** Add `client_id uuid` column to `shop_orders` (nullable, references `clients.id`). Existing rows stay null (guest orders).

### Part C — Admin: create order for client
Repurpose existing `src/pages/dashboard/sales/ProductInvoice.tsx` OR add a new "নতুন অর্ডার তৈরি করুন" button on `src/pages/dashboard/shop/Orders.tsx`:
- Open a dialog: pick client → autofill address → pick products from `shop_products` (multi-line) → set qty/price/shipping → create row in `shop_orders` + `shop_order_items`
- Default `order_status="processing"`, `payment_method="cod"`, `payment_status="pending"`
- After save → opens order detail
- Cleaner approach: **new file** `src/pages/dashboard/shop/AdminCreateOrder.tsx` linked from Orders page

### Part D — Portal shop (logged-in clients order from portal)
Add 2 portal pages:
- `src/pages/portal/PortalShop.tsx` — same product grid as public `Shop.tsx` but inside `PortalLayout`
- `src/pages/portal/PortalShopCheckout.tsx` — uses portal session (no name/mobile form needed)
- `src/pages/portal/PortalMyOrders.tsx` — list of this client's orders + status + tracking
- Add menu items to `PortalLayout` sidebar: "শপ", "আমার অর্ডার"
- Routes added to `App.tsx` under portal section

### Part E — Order status workflow
Already partially exists (`order_status` column with pending/processing/etc). Verify in `src/pages/dashboard/shop/OrderDetail.tsx`:
- Status transitions: `pending → processing → shipped → delivered → completed`
- "Completed" + `payment_status="paid"` → existing trigger `activate_warranty_on_paid` auto-fills `warranty_start`/`warranty_end` ✓
- Add a clear "অর্ডার সম্পন্ন (Seal)" button that sets both `order_status="completed"` and `payment_status="paid"` together — triggers warranty activation

### Files
- **Migration:** add `client_id` to `shop_orders`
- **Edit:** `src/pages/public/Checkout.tsx` — autofill from portal session
- **Edit:** `src/pages/dashboard/shop/Orders.tsx` — "নতুন অর্ডার তৈরি" button
- **New:** `src/pages/dashboard/shop/AdminCreateOrder.tsx` — admin order creation form
- **New:** `src/pages/portal/PortalShop.tsx`
- **New:** `src/pages/portal/PortalShopCheckout.tsx`
- **New:** `src/pages/portal/PortalMyOrders.tsx`
- **Edit:** `src/components/PortalLayout.tsx` — add sidebar menu
- **Edit:** `src/App.tsx` — register portal routes + admin route
- **Edit:** `src/pages/dashboard/shop/OrderDetail.tsx` — "Seal/Complete" button + status flow
- **Edit:** `src/pages/dashboard/shop/Products.tsx`/`ProductForm.tsx` — already has free_shipping (previous task)

### Result
- Logged-in client checkout → minimal form, prefilled, COD default
- Admin can create order for any client from dashboard
- Portal users see Shop + My Orders inside portal
- Order seal button → warranty auto-activates from existing trigger

### Open question
Should the previous "Free Shipping" plan (per-product flag + admin override) be combined with this work in the same change? It touches overlapping files (Checkout, OrderDetail, ProductForm). I'll include both unless you say otherwise.
