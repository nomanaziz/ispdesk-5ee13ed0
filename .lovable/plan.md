

## Plan: Build All 14 Website Panel Pages with Full CRUD

All 14 Website Panel pages are currently placeholders. Each will be rebuilt into a functional admin CRUD page backed by its corresponding database table. No database changes needed -- all tables already exist with RLS policies.

### Pages and Their Database Tables

| Page | DB Table | Key Fields | UI Pattern |
|---|---|---|---|
| 1. Website Dashboard | Aggregates all website_* tables | Counts + recent items | Stats cards + recent activity |
| 2. Homepage Editor | `landing_content` | section, content_key, content_value (JSONB), sort_order, is_active | Section-based editor with JSONB content editing |
| 3. Pages (CMS) | `website_pages` | title, slug, content, status (draft/published), sort_order | Table + dialog with textarea for content |
| 4. Notices | `website_notices` | title, content, status (draft/published), publish_date | Table + add/edit dialog |
| 5. Offers | `website_offers` | title, description, discount_text, image_url, start_date, end_date, status | Table + dialog with date pickers |
| 6. Testimonials | `website_testimonials` | name, designation, company, content, rating, image_url, sort_order, status | Table + dialog with star rating |
| 7. Partners | `website_partners` | name, logo_url, website_url, sort_order, status | Table + dialog |
| 8. Features | `website_features` | title, description, icon, sort_order, status | Table + dialog |
| 9. Services | `website_services` | title, description, icon, image_url, sort_order, status | Table + dialog |
| 10. Festivals | `website_festivals` | title, description, image_url, start_date, end_date, status | Table + dialog with date range |
| 11. Menu Editor | `website_menu` | title, url, parent_id (self-ref), sort_order, status | Tree-like table with parent dropdown |
| 12. Media Library | `website_media` | filename, url, alt_text, file_type, file_size | Grid/table view (URL-based, no storage bucket) |
| 13. About Page Editor | `landing_content` (section='about') | content_key, content_value JSONB | Key-value editor for about section content |
| 14. Site Settings | `landing_content` (section='settings') | content_key, content_value JSONB | Settings form (company name, logo, contact, social links) |

### UI Pattern for Each CRUD Page

Each page follows a consistent pattern:
- **Header**: Title + "Add New" button
- **Data table**: Columns matching key fields, status badges, action buttons (edit/delete)
- **Dialog**: Form with inputs for all fields, handles both create and update
- **Queries**: `useQuery` for fetching, `useMutation` for insert/update/delete with `queryClient.invalidateQueries`
- **Toast notifications** on success/error

### Technical Details

- All pages use `@tanstack/react-query` + Supabase client
- Dialog forms use shadcn `Dialog`, `Input`, `Textarea`, `Select`, `Switch`
- Status toggles use `Switch` component
- Sort order uses numeric `Input`
- Date fields use native date inputs
- Image URLs are text inputs (no file upload -- Media Library is URL-based registry)
- Menu Editor uses a parent_id dropdown referencing other menu items for nested structure

### Files to Edit (14 files)

```
src/pages/dashboard/website/WebsiteDashboard.tsx
src/pages/dashboard/website/HomepageEditor.tsx
src/pages/dashboard/website/WebsitePages.tsx
src/pages/dashboard/website/WebsiteNotices.tsx
src/pages/dashboard/website/WebsiteOffers.tsx
src/pages/dashboard/website/WebsiteTestimonials.tsx
src/pages/dashboard/website/WebsitePartners.tsx
src/pages/dashboard/website/WebsiteFeatures.tsx
src/pages/dashboard/website/WebsiteServices.tsx
src/pages/dashboard/website/WebsiteFestivals.tsx
src/pages/dashboard/website/WebsiteMenu.tsx
src/pages/dashboard/website/WebsiteMedia.tsx
src/pages/dashboard/website/WebsiteAbout.tsx
src/pages/dashboard/website/WebsiteSettings.tsx
```

### Implementation Order

Build in batches for efficiency:
1. **Batch 1** (Simple CRUD tables): Notices, Features, Partners, Services -- straightforward table+dialog pattern
2. **Batch 2** (Date-based): Offers, Festivals, Testimonials -- add date pickers and rating
3. **Batch 3** (Content editors): Pages, Menu Editor, Media Library -- slug, tree structure, grid
4. **Batch 4** (JSONB editors): Homepage Editor, About Page, Site Settings -- landing_content based
5. **Batch 5** (Dashboard): Website Dashboard -- aggregate stats from all tables

