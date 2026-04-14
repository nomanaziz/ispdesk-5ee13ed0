

## Plan: Merge Duplicate Panels

The Website Panel currently has 4 items that duplicate functionality already existing in other modules. This plan removes those duplicates from the Website Panel sidebar and redirects their routes, so each feature lives in exactly one place.

### Merges

| Website Panel Item | Merges Into | What Happens |
|---|---|---|
| Packages Display | Configuration > Package | Remove from Website Panel sidebar. Config Package page gets a "Show on Homepage" toggle column. |
| Coverage Areas | Configuration > District + Upazila | Remove from Website Panel sidebar. These already exist in Config. |
| Orders | Client > New Request | Remove from Website Panel sidebar. Already shows same `client_requests` data. |
| Payment Methods | System > Payment Gateways | Remove from Website Panel sidebar. System Payment Gateways page manages payment methods for both website and system. |

### Files to Edit

1. **`src/components/AppSidebar.tsx`** -- Remove 4 items from Website Panel sidebar group (Packages Display, Coverage Areas, Orders, Payment Methods). Website Panel goes from 18 items to 14.

2. **`src/App.tsx`** -- Remove 4 website routes (`/dashboard/website/packages`, `/dashboard/website/coverage`, `/dashboard/website/orders`, `/dashboard/website/payments`). Remove their imports. Add redirect routes from old URLs to new locations for safety.

3. **Delete 4 files** (no longer needed):
   - `src/pages/dashboard/website/WebsitePackages.tsx`
   - `src/pages/dashboard/website/WebsiteCoverage.tsx`
   - `src/pages/dashboard/website/WebsiteOrders.tsx`
   - `src/pages/dashboard/website/WebsitePayments.tsx`

4. **`src/pages/dashboard/config/Packages.tsx`** -- Rebuild from placeholder to a functional table showing `isp_packages` with a "Show on Homepage" toggle switch per row, so admins can control which packages appear on the public website from the same page they manage package config.

5. **`src/pages/dashboard/system/PaymentGateways.tsx`** -- Rebuild from placeholder to show `payment_methods` table with logo, account number, color, visibility toggle -- managing both website display and system payment config in one place.

### Result

The Website Panel sidebar will contain 14 content-management items (Homepage Editor, Pages, Notices, Offers, Testimonials, Partners, Features, Services, Festivals, Menu Editor, Media Library, About Page, Site Settings, Website Dashboard). No duplication with other modules.

