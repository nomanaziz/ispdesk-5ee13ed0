

## Plan: Add Division (বিভাগ) to Configuration Hierarchy

Currently the hierarchy is: District → Upazila. This plan adds a Division level above District, making it: **Division → District → Upazila**.

### Database Changes

**New table: `divisions`**
- `id` (uuid, PK, default gen_random_uuid())
- `name` (text, NOT NULL) — e.g. ঢাকা, চট্টগ্রাম
- `code` (text) — e.g. Dhaka, Chattogram
- `status` (text, default 'active')
- `created_at` (timestamptz, default now())
- RLS: same pattern as other config tables (admin manage, authenticated view)

**Alter `districts` table:**
- Add `division_id` (uuid, nullable, FK → divisions.id)

**Seed data:** Insert all 8 Bangladesh divisions (ঢাকা, চট্টগ্রাম, রাজশাহী, খুলনা, বরিশাল, সিলেট, রংপুর, ময়মনসিংহ) and update each district's `division_id` to point to its correct division.

### Frontend Changes

| File | Change |
|---|---|
| `src/pages/dashboard/config/Divisions.tsx` | **New** — CRUD page with cascade toggle (off → deactivate all districts + upazilas under it) |
| `src/pages/dashboard/config/Districts.tsx` | **Edit** — Add `division_id` select field + division filter + show division column |
| `src/pages/dashboard/config/Upazilas.tsx` | **Edit** — Optionally add division filter for convenience |
| `src/App.tsx` | **Edit** — Add route `/dashboard/config/divisions` |
| `src/components/AppSidebar.tsx` | **Edit** — Add "Division" nav item before District |

### Cascade Logic
- Division OFF → all its districts + their upazilas become inactive
- Division ON → all its districts + their upazilas reactivate
- District OFF → still cascades to its upazilas (existing behavior preserved)

### Technical Notes
- Division-to-district mapping based on standard Bangladesh administrative data
- `ConfigCrudPage` reusable component handles the CRUD UI — no new components needed

