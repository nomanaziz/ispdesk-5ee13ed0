

## Plan: Website Control Panel + Feature Integration

Based on exploring the Galaxy Net admin panel at galaxynetbd.com/admin, I've mapped all 20 sections. This plan adds a **Website Control Panel** to the ERP dashboard sidebar and integrates shared data (coverage from districts, team from HR, payments to system).

### What the Galaxy Net Admin Panel Has

| # | Section | Purpose |
|---|---------|---------|
| 1 | Dashboard | Stats: Total Orders, Active Packages, Coverage Areas, Pending Orders |
| 2 | Packages | CRUD for public website packages (name, speed, price, category, homepage/popular/visible toggles) |
| 3 | Coverage | Manage coverage areas shown on public site |
| 4 | Orders | New connection orders from public site (= our `client_requests`) |
| 5 | Pages | Custom CMS pages (title, slug, status) |
| 6 | Notices | Public notice board |
| 7 | Offers | Special offers/promotions |
| 8 | Testimonials | Customer testimonials for public site |
| 9 | Partners | Partner/sponsor logos |
| 10 | Features | Feature highlights for public site |
| 11 | Menu | Navigation menu editor |
| 12 | Payments | Payment methods (bKash, bank transfer) with logo, account, color, visibility |
| 13 | Homepage | Hero section editor (title, description, CTA in EN/BN) |
| 14 | Media | File/image upload manager |
| 15 | Services | Service descriptions for public site |
| 16 | Festivals | Festival/seasonal banners |
| 17 | About Page | About page content editor |
| 18 | Departments | Team departments (merges with HR) |
| 19 | Designations | Job titles (merges with HR positions) |
| 20 | Employees | Public-facing team members (merges with HR employees) |
| 21 | Settings | Site settings (name, tagline, phone, email, address, social links, WhatsApp, maintenance mode) |
| 22 | Users | Admin users |

### Integration & Merge Strategy

1. **Coverage** -- Uses existing `districts` + `zones` + `sub_zones` tables from Configuration. The website control panel page will read from those same tables (no duplication).

2. **Departments / Designations / Employees** -- Uses existing HR module tables (`departments`, `positions`, `employees`). The website panel just adds a "Show on Website" toggle field to those tables.

3. **Orders** -- Already exists as `client_requests` table. The website panel Orders page shows the same data as `/dashboard/clients/new-request`.

4. **Payments** -- Merges into System > Payment Gateways. The website panel Payments page manages payment methods that show on the public Quick Pay page AND feed into System payment config.

5. **Packages** -- Uses existing `isp_packages` table (already has the data). Website panel adds homepage/popular toggle management.

### New Database Tables Needed

```sql
-- Website-specific content tables
CREATE TABLE website_pages (id, title, slug, content, status, sort_order, created_at);
CREATE TABLE website_notices (id, title, content, status, publish_date, created_at);
CREATE TABLE website_offers (id, title, description, image_url, discount_text, status, start_date, end_date, created_at);
CREATE TABLE website_testimonials (id, name, designation, company, content, rating, image_url, status, sort_order, created_at);
CREATE TABLE website_partners (id, name, logo_url, website_url, status, sort_order, created_at);
CREATE TABLE website_features (id, title, description, icon, status, sort_order, created_at);
CREATE TABLE website_services (id, title, description, icon, image_url, status, sort_order, created_at);
CREATE TABLE website_festivals (id, title, description, image_url, status, start_date, end_date, created_at);
CREATE TABLE website_menu (id, title, url, parent_id, sort_order, status, created_at);
CREATE TABLE website_media (id, filename, url, file_type, file_size, alt_text, created_at);
CREATE TABLE payment_methods (id, name, category, account_number, logo_url, color, status, sort_order, created_at);

-- Add website visibility columns to existing tables
ALTER TABLE employees ADD COLUMN show_on_website boolean DEFAULT false;
ALTER TABLE isp_packages ADD COLUMN show_on_homepage boolean DEFAULT false;
```

The existing `landing_content` table handles Homepage and About Page settings (hero section, site settings etc.).

### New Sidebar Group: "Website Panel"

Add a new sidebar group between Dashboard and Configuration:

```
Website Panel (icon: Globe)
  ├── Website Dashboard (stats: orders, packages, coverage areas)
  ├── Homepage Editor
  ├── Packages Display
  ├── Coverage Areas (reads from zones/districts)
  ├── Orders (reads from client_requests)
  ├── Pages
  ├── Notices
  ├── Offers
  ├── Testimonials
  ├── Partners
  ├── Features
  ├── Services
  ├── Festivals
  ├── Menu Editor
  ├── Payment Methods
  ├── Media Library
  ├── About Page
  └── Site Settings
```

### New Routes

All under `/dashboard/website/*`:
- `/dashboard/website` -- Website Dashboard
- `/dashboard/website/homepage` -- Homepage Editor
- `/dashboard/website/packages` -- Package display management
- `/dashboard/website/coverage` -- Coverage (reads zones/districts)
- `/dashboard/website/orders` -- Orders (reads client_requests)
- `/dashboard/website/pages` -- CMS Pages
- `/dashboard/website/notices` -- Notices
- `/dashboard/website/offers` -- Offers
- `/dashboard/website/testimonials` -- Testimonials
- `/dashboard/website/partners` -- Partners
- `/dashboard/website/features` -- Features
- `/dashboard/website/services` -- Services
- `/dashboard/website/festivals` -- Festivals
- `/dashboard/website/menu` -- Menu Editor
- `/dashboard/website/payments` -- Payment Methods
- `/dashboard/website/media` -- Media Library
- `/dashboard/website/about` -- About Page Editor
- `/dashboard/website/settings` -- Site Settings

### Files to Create/Edit

**New files (18 pages)**:
- `src/pages/dashboard/website/WebsiteDashboard.tsx`
- `src/pages/dashboard/website/HomepageEditor.tsx`
- `src/pages/dashboard/website/WebsitePackages.tsx`
- `src/pages/dashboard/website/WebsiteCoverage.tsx`
- `src/pages/dashboard/website/WebsiteOrders.tsx`
- `src/pages/dashboard/website/WebsitePages.tsx`
- `src/pages/dashboard/website/WebsiteNotices.tsx`
- `src/pages/dashboard/website/WebsiteOffers.tsx`
- `src/pages/dashboard/website/WebsiteTestimonials.tsx`
- `src/pages/dashboard/website/WebsitePartners.tsx`
- `src/pages/dashboard/website/WebsiteFeatures.tsx`
- `src/pages/dashboard/website/WebsiteServices.tsx`
- `src/pages/dashboard/website/WebsiteFestivals.tsx`
- `src/pages/dashboard/website/WebsiteMenu.tsx`
- `src/pages/dashboard/website/WebsitePayments.tsx`
- `src/pages/dashboard/website/WebsiteMedia.tsx`
- `src/pages/dashboard/website/WebsiteAbout.tsx`
- `src/pages/dashboard/website/WebsiteSettings.tsx`

**Edited files**:
- `src/components/AppSidebar.tsx` -- Add "Website Panel" group
- `src/App.tsx` -- Register 18 new routes
- Database migration -- Create 11 new tables + ALTER 2 existing tables

### Implementation Order

1. Run database migration (create tables, alter existing)
2. Create all 18 website panel page files (placeholder first, then full CRUD)
3. Update sidebar with Website Panel group
4. Update App.tsx with routes

