
User wants free shipping support in the e-commerce shop. Two ways:
1. Per-product flag — some products ship free regardless of zone
2. Manual override — admin can mark an order/cart as free shipping

## Plan

### 1. DB schema changes (migration)
- Add `free_shipping boolean default false` to `shop_products`
- (Order-level free shipping already implicit via existing `shipping` column — admin can set 0)

### 2. Admin product form (`ProductForm.tsx`)
- Add a "ফ্রি শিপিং" checkbox — when checked, this product never adds shipping charge

### 3. Cart store (`useCart.ts`)
- Add `freeShipping: boolean` to `CartItem`
- Track per-item free shipping flag

### 4. Shop page (`Shop.tsx`)
- Pass `freeShipping: p.free_shipping` when adding to cart
- Show "ফ্রি শিপিং" badge on product cards

### 5. Product detail (`ShopProduct.tsx`)
- Show "ফ্রি শিপিং" badge
- Pass flag when adding to cart

### 6. Checkout (`Checkout.tsx`) — core logic
- If **all items** in cart are `freeShipping=true` → shipping = 0, label "ফ্রি শিপিং"
- Otherwise normal zone-based shipping
- Add manual override field: "ফ্রি শিপিং কুপন/কোড" or simple admin checkbox? → keep simple: a "ফ্রি শিপিং প্রয়োগ করুন" toggle visible only via coupon code (reuse existing `shop_coupons` if shipping-type coupons exist) OR just a discount field
- Decision: keep manual override out of public checkout (security). Free shipping comes only from product flag. Admin can later edit order's `shipping=0` from order detail.

### 7. Order detail admin (`OrderDetail.tsx`)
- Add "ফ্রি শিপিং করুন" button → sets `shipping=0`, recalculates `total`

### Files
- **Migration:** add `free_shipping` to `shop_products`
- **Edit:** `src/pages/dashboard/shop/ProductForm.tsx` — checkbox
- **Edit:** `src/pages/dashboard/shop/Products.tsx` — show flag in list (optional)
- **Edit:** `src/stores/useCart.ts` — add field
- **Edit:** `src/pages/public/Shop.tsx` — badge + pass flag
- **Edit:** `src/pages/public/ShopProduct.tsx` — badge + pass flag
- **Edit:** `src/pages/public/Cart.tsx` — show "ফ্রি" tag per item
- **Edit:** `src/pages/public/Checkout.tsx` — if all items free → shipping 0
- **Edit:** `src/pages/dashboard/shop/OrderDetail.tsx` — manual "Make free shipping" button

### Result
- Admin product form-এ "ফ্রি শিপিং" toggle
- ফ্রি শিপিং product cart-এ thাকলে checkout-এ shipping = 0
- Mixed cart হলে normal shipping (paid items dominate)
- Admin order detail থেকে manually free shipping দিতে পারবে
