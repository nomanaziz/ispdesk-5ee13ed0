

## কাজ — সব portal-এ Basic Notes (Sticky Notes) system

৪টা portal-এ একই simple notes feature — header-এর "Take a Note" button → dialog → title + color + content → save → list view।

### কোথায় add হবে
1. **Admin Dashboard** — `TopBar.tsx`-এ "Take a Note" button + `/dashboard/notes` route
2. **POP Admin Portal** — `ResellerLayout.tsx` header-এ button + `/pop-admin/notes` route
3. **Client Portal** — `PortalLayout.tsx` header-এ button + `/portal/notes` route
4. **BW Sale** — admin dashboard-এর অংশ, তাই TopBar-এ পাওয়া যাবে (আলাদা portal না)

### Database (নতুন table)

```sql
CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL,         -- 'admin' | 'pop' | 'client' | 'reseller_sub' | 'pop_sub'
  owner_id text NOT NULL,           -- auth.uid() for admin, customer.sub for portal users
  title text,
  content text,
  color text NOT NULL DEFAULT 'yellow',  -- yellow|blue|green|pink|purple|orange
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_notes_owner ON public.user_notes(owner_type, owner_id, created_at DESC);
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
```

**RLS:** Admin/super reads all. Portal users (non-auth.uid) — open INSERT/SELECT/UPDATE/DELETE policy filtered by `owner_type` + `owner_id` matched in app code (since portal uses custom JWT not Supabase auth, RLS can't enforce; we'll filter in queries). Actual hard isolation: portal CRUD goes through the existing `portal-data` edge function with the JWT verifying owner.

Simpler approach (chosen): admin uses Supabase auth + RLS; portal users (POP/client) call a small new edge function `portal-notes` that verifies the portal JWT and does CRUD with service role, scoping by `owner_type` + `customer.sub`.

### Files

**New:**
- `src/components/notes/NoteDialog.tsx` — Take/Edit note modal (title input, 6 color swatches, content textarea, Save/Cancel)
- `src/components/notes/NotesButton.tsx` — header button "📝 Note" + opens dialog (props: `ownerType`, `ownerId`)
- `src/components/notes/NotesList.tsx` — masonry grid of colored sticky cards (pin, edit, delete actions)
- `src/pages/notes/AdminNotes.tsx` — `/dashboard/notes` page wrapper
- `src/pages/notes/PopNotes.tsx` — `/pop-admin/notes` page wrapper
- `src/pages/notes/ClientNotes.tsx` — `/portal/notes` page wrapper
- `src/lib/notesApi.ts` — small data-access helper: admin uses `supabase.from("user_notes")`, portal uses fetch to edge function
- `supabase/functions/portal-notes/index.ts` — POST `{action, ...}` with portal JWT; supports list/create/update/delete/togglePin

**Edited:**
- `src/components/TopBar.tsx` — add `<NotesButton ownerType="admin" />` next to existing icons
- `src/components/ResellerLayout.tsx` — add `<NotesButton ownerType="pop" />` in header
- `src/components/PortalLayout.tsx` — add `<NotesButton ownerType="client" />` in header
- `src/App.tsx` — register the 3 new routes
- `src/components/AppSidebar.tsx`, `ResellerLayout.tsx`, `PortalLayout.tsx` — add "Notes" sidebar entry (optional, low priority — primary entry is the header button)

### UI behaviour (simple)

**Header button:** small icon + "Note" label → opens `NoteDialog` in "create" mode → on save, inserts and toasts. Click "View All" link inside dialog → navigates to `/…/notes` list.

**NoteDialog fields:**
- Title (optional, max 80)
- Color picker — 6 swatches (yellow/blue/green/pink/purple/orange)
- Content textarea (required)
- Pin checkbox
- Save / Cancel

**Notes list page:** masonry grid of colored cards, pinned ones first; each card shows title, content (clamped 6 lines), date, and hover actions: pin/unpin, edit, delete. Search box on top, color filter chips. Empty state with a "Take a Note" CTA.

### কী বদলাবে না
- Admin সব data, অন্যান্য module untouched
- Existing tickets / employee / packages কিছুই ছোঁয়া হবে না
- Public site untouched (visitors-এর জন্য notes দরকার নেই)

### Apply-এর পরে expected ফলাফল
1. ✅ চারটা portal-এর header-এ "Take a Note" button
2. ✅ Color + title + content দিয়ে note save
3. ✅ Notes list page — masonry grid, pin/edit/delete/search/filter
4. ✅ প্রতিটা user শুধু নিজের notes দেখবে (admin auth.uid, portal user customer.sub দিয়ে scoped)
5. ✅ Edge function `portal-notes` portal users-দের secure CRUD provide করবে

