## Goal
Bandwidth admin portal-কে main ERP portal-এর same pattern-এ আনব: sidebar/menu, icon, active submenu indicator, এবং dashboard widgets সব একরকম polished হবে।

## Implementation plan

1. **Bandwidth sidebar pattern replace**
   - `BwCustomerLayout` থেকে পুরনো uploaded/Icons8 icon dependency পুরো সরানো হবে।
   - Main portal-এর `MenuIconTile` + `tintForLabel` pattern ব্যবহার করা হবে।
   - Group menu, single menu, submenu—সব জায়গায় Lucide icon + colored square tile থাকবে।

2. **Active menu/submenu indicator fix**
   - Main `AppSidebar` pattern copy করে:
     - active parent group-এর left vertical indicator থাকবে।
     - open submenu list-এর left border থাকবে।
     - selected submenu-এর ছোট horizontal connector line + active vertical marker থাকবে।
   - এখন যে “দাগ/link” inconsistent আসে সেটি ঠিক করে exact selected state দেখানো হবে।

3. **Menu structure cleanup**
   - `/bw/*` billing/customer menus এবং `/bw/panel/*` admin-panel menus এক sidebar-এ রাখা হবে।
   - Panel active না হলে শুধু billing/basic menu থাকবে; active হলে MikroTik, Clients, Billing, Monitoring, Tickets, SMS, Employees, Accounting, Reports menu দেখাবে।
   - Menu route matching order ঠিক করা হবে, যাতে `/bw/panel/clients/add` ভুলভাবে `/bw/panel/clients` active না দেখায়।

4. **Header/sidebar visual alignment**
   - Sidebar background, border, search input, menu spacing, typography, hover/active colors main portal-এর style অনুযায়ী করা হবে।
   - Mobile drawer behavior unchanged থাকবে, কিন্তু visual pattern same হবে।

5. **Dashboard widget cleanup**
   - `BwDashboard`-এর oversized/round “সর্দার মতো” cards কমিয়ে main portal-এর compact KPI/MetricTile pattern-এ align করা হবে।
   - Panel active হলে internal POP metrics section main POP dashboard-এর মতো clean grid layout পাবে।
   - Unnecessary huge rounded cards/gradient-heavy widgets কমানো হবে।

6. **Validation**
   - Routes/menu target cross-check করব: `/bw/dashboard`, `/bw/invoices`, `/bw/service-orders`, `/bw/settings`, এবং সব `/bw/panel/*` routes।
   - Sidebar icon source আর `Icons8Icon` থাকবে না—সব Lucide + project menu tile pattern হবে।
   - Active submenu indicator visually consistent কিনা code-level যাচাই করব।

## Files expected to change
- `src/components/BwCustomerLayout.tsx`
- `src/pages/bw-customer/BwDashboard.tsx`

## Technical notes
- No database or edge function change needed.
- Existing `MenuIconTile` component reused, duplicate styling avoided.
- Main portal `AppSidebar` active-state classes will be adapted, not rewritten from scratch.