

## Plan: Redesign Users Page & Add UserReview Route

### Overview
Clean up and simplify the Users page (3 tabs), add the missing UserReview route, and ensure mobile responsiveness throughout.

### Changes

**1. `src/pages/dashboard/system/Users.tsx`** — Simplify and clean up:
- Remove overly dense inline styles, use cleaner spacing
- Make filter row stack vertically on mobile (grid cols 1 → 3)
- Make tables horizontally scrollable with `overflow-x-auto`
- Simplify the New User wizard dialog for mobile (smaller padding, full-width inputs)
- Keep all 3 tabs (Application Users, User Roles, Role Modules) with existing functionality
- Clean up table column widths for better readability
- Add responsive text sizes

**2. `src/pages/dashboard/system/UserReview.tsx`** — Clean up:
- Already well-built with Step 1-4 layout and edit dialogs
- Add responsive padding and stack layout on mobile
- Ensure dialogs are mobile-friendly (max-w-md → responsive)
- Add `Zip/Postal` and `Action` columns to login history table to match portal exactly

**3. `src/App.tsx`** — Add missing route:
- Import `UserReview` component
- Add route: `/dashboard/system/users/:id` → `<UserReview />`

### Technical Details
- No database changes needed
- 3 files edited: `Users.tsx`, `UserReview.tsx`, `App.tsx`
- Mobile-first responsive: stacked filters on small screens, horizontal scroll tables
- All existing CRUD logic preserved

