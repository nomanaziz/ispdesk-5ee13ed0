

## ই-কমার্স মডিউল — ISP Product Shop + Warranty Management

### Scope (একটাই unified module)

1. **Public storefront** — `/shop`, `/shop/:slug`, `/cart`, `/checkout`, `/order/:id/track`
2. **Admin product/order/warranty management** — `/dashboard/shop/*`
3. **Payment** — existing payment gateway settings ব্যবহার করব (bKash/Nagad/SSLCommerz/RechargeServer/COD)
4. **Warranty** — product-এ months দেওয়া থাকবে → order paid হলেই warranty start, claim system সহ

### Database (new tables)

```
shop_categories (id, name, slug, parent_id, sort_order, image, status)
shop_products   (id, sku, name, slug, category_id, brand, short_desc, long_desc,
                 price, compare_price, stock, low_stock_alert, unit, weight_kg,
                 warranty_months, images jsonb, specs jsonb, featured, status)
shop_orders     (id, order_no, customer_name, mobile, email, address, district,
                 thana, area, inside_dhaka bool, subtotal, shipping, discount,
                 total, payment_method, payment_status, order_status,
                 trx_id, notes, user_id nullable, created_at)
shop_order_items(id, order_id, product_id, sku, name, price, quantity, subtotal,
                 warranty_months, warranty_start, warranty_end)
shop_shipping_zones (id, name, charge, is_default)   -- seed: Inside Dhaka 80, Outside 150
shop_coupons    (id, code, type, value, min_order, expires_at, usage_limit, used)
warranty_claims (id, order_item_id, claim_no, issue, status, admin_note,
                 received_at, resolved_at, resolution_type)
```
RLS: products/categories public read; orders insert public; admin full via `is_admin_or_super`.

### Public Storefront (new pages)

| Route | Purpose |
|-------|---------|
| `/shop` | Grid, category filter, search, price sort. Card: image, name, price, "Add to Cart" |
| `/shop/:slug` | Gallery, price, stock, warranty badge, specs, qty + Add to Cart / Buy Now |
| `/cart` | Line items, qty edit, remove, totals, "Proceed to Checkout" (Zustand store, persisted) |
| `/checkout` | Form: Name, Mobile, Email, District (dropdown — 64 districts), Thana, Address. Auto shipping: ঢাকা=80, অন্য=150. Payment radio: bKash/Nagad/SSLCommerz/COD. Submit → creates `shop_orders` + items, redirects to payment or thank-you |
| `/order/:id/track` | Order status, items, warranty period |

Navbar-এ "শপ" link add।

### Admin (new pages under `/dashboard/shop`)

- **Categories** — CRUD tree
- **Products** — list + create/edit (image upload via `shop-products` storage bucket, warranty months field)
- **Orders** — list with filters (status/payment/date), detail view: update order status (pending → confirmed → shipped → delivered → cancelled), update payment_status, print invoice. **Payment confirm হলে item-এ warranty_start = today, warranty_end = today + months** (DB trigger)
- **Shipping Zones** — Dhaka/Outside charges editable
- **Coupons** — CRUD
- **Warranty Claims** — list (filter by status/customer), detail page: link to order/item, status workflow (received → in_progress → resolved/rejected), admin note
- **Sales Report** — daily/monthly revenue, top products

Sidebar-এ "ই-কমার্স" group: Categories, Products, Orders, Shipping, Coupons, Warranty, Reports।

### Warranty Logic

- Product-এ `warranty_months` (default 12) সেট হবে।
- Order-এর payment_status `paid` হলে DB trigger `shop_order_items.warranty_start = CURRENT_DATE`, `warranty_end = warranty_start + warranty_months months`।
- COD হলে admin manually "Mark as Paid" করলে trigger fire।
- Customer `/order/:id/track` থেকে "Claim Warranty" button → creates `warranty_claims` row → admin dashboard-এ pending হিসেবে দেখা যাবে।
- Warranty expired হলে claim button disabled।

### Payment Integration

- Initial release: **COD + Manual (bKash/Nagad TrxID submit)** — order created, payment_status=`pending`, admin verify করে paid mark করে।
- Existing `payment_gateways` system setting থেকে active methods auto-show on checkout।
- SSLCommerz/RechargeServer/bKash auto-checkout edge function পরে phase-2 (already partial infra আছে — `rechargeserver-payment` function)। প্রথম phase-এ manual flow।

### Cart State

- Zustand + localStorage persist
- `useCart` hook: items, addItem, updateQty, removeItem, clear, totals

### Files (new)

| File | Purpose |
|------|---------|
| `supabase/migrations/...` | All shop_* tables + warranty trigger + RLS + seed shipping zones |
| `src/stores/useCart.ts` | Zustand cart store |
| `src/lib/shopUtils.ts` | format price, shipping calc, district list (64) |
| `src/pages/public/Shop.tsx` | Storefront grid |
| `src/pages/public/ShopProduct.tsx` | Product detail |
| `src/pages/public/Cart.tsx` | Cart page |
| `src/pages/public/Checkout.tsx` | Checkout form |
| `src/pages/public/OrderTrack.tsx` | Order tracking + claim |
| `src/components/public/CartIcon.tsx` | Navbar cart badge |
| `src/pages/dashboard/shop/Categories.tsx` | Admin |
| `src/pages/dashboard/shop/Products.tsx` | Admin list |
| `src/pages/dashboard/shop/ProductForm.tsx` | Admin create/edit |
| `src/pages/dashboard/shop/Orders.tsx` | Admin list |
| `src/pages/dashboard/shop/OrderDetail.tsx` | Admin detail + status |
| `src/pages/dashboard/shop/ShippingZones.tsx` | Admin |
| `src/pages/dashboard/shop/Coupons.tsx` | Admin |
| `src/pages/dashboard/shop/WarrantyClaims.tsx` | Admin |
| `src/pages/dashboard/shop/SalesReport.tsx` | Admin |

Edits: `App.tsx` (routes), `AppSidebar.tsx` (e-commerce group), `PublicNavbar.tsx` (Shop link + cart icon), new storage bucket `shop-products`।

### Deferred (next iteration after approval)

- bKash/SSLCommerz auto-checkout edge function (currently manual TrxID flow)
- SMS/email order confirmation
- Wishlist, reviews, related products
- Stock movement ledger linked to inventory module

