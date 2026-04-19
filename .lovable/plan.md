

## মূল সমস্যা (Root Cause)

Portal user-রা **custom JWT** দিয়ে login করে — Supabase Auth session নয়। তাই `clients`, `billing`, `zones`, `isp_packages` table-এর RLS policies (`auth.uid()` based, `authenticated` role) → **সব query empty** ফেরত দেয়। তাই dashboard-এ শুধু JWT payload দেখায় (username, code), DB থেকে কিছুই আসে না।

DB check করে দেখলাম:
- naeem-এর client row আছে — package, speed, protocol, monthly_bill সব আছে
- ১টা billing row আছে
- কিন্তু `contact`, `email`, `address` column গুলো আসলেই **খালি**

## সমাধান কৌশল

Client-side থেকে সরাসরি RLS-protected table query না করে — একটা **portal-data edge function** বানাব যা JWT verify করে service role দিয়ে data fetch করবে। সাথে user-self-update flow।

### A) Edge function: `portal-data`
Action-based endpoint:
- `get_dashboard` → client row + zone + package + last 12 billing → একসাথে return
- `get_bills` / `get_ledger` / `get_notices` / `get_live_usage` — পরে portal pages ও same function ব্যবহার করবে
- `update_profile` → present_address / permanent_address / mobile / email update (auto-apply, simple fields)
- `submit_doc_update` → NID/photo/document upload request (admin approval দরকার)
- `upload_url` → signed upload URL for storage

প্রতি call-এ Bearer token (portal_token) verify → expired check → user_type check।

### B) DB changes (migration)
- **`clients` table extend**: `present_address`, `permanent_address`, `photo_url`, `nid_front_url`, `nid_back_url`, `documents` (jsonb)
- **নতুন table `client_update_requests`**: 
  - `id, client_id, request_type ('profile'|'document'), changes (jsonb), status ('pending'|'approved'|'rejected'), reviewed_by, reviewed_at, created_at, note`
  - RLS: admins manage; portal users insert via edge function only
- **নতুন storage bucket `client-documents`** (private) + RLS — শুধু admin + edge function read

### C) Portal frontend updates
- `PortalDashboard.tsx` → useQuery `portal-data?action=get_dashboard` দিয়ে replace সব Supabase direct query
- নতুন **`PortalProfile.tsx`** page (`/portal/profile`):
  - Self-update form: present/permanent address, mobile, email — Save → instant update
  - Photo upload (avatar)
  - NID front/back upload, other documents
  - Pending requests panel (status দেখাবে)
- Sidebar-এ "My Profile" link

### D) Admin notification
- নতুন **`UserUpdateRequests.tsx`** admin page (`/dashboard/clients/update-requests`):
  - Pending requests list, side-by-side diff (current vs requested), Approve/Reject buttons
  - Approve → apply changes to `clients` table + mark approved
- **TopBar bell badge** → pending count (poll every 60s) → click navigate
- Realtime subscription on `client_update_requests` (optional refinement)

### E) ছোট portal pages একই pattern-এ
PortalBills, PortalLedger, PortalNotices, PortalLiveUsage — সব `portal-data` edge function call করবে (RLS bypass safely via JWT verification)।

## Files

**Migration:**
- ALTER `clients` add: `present_address`, `permanent_address`, `photo_url`, `nid_front_url`, `nid_back_url`, `documents jsonb`
- CREATE `client_update_requests` table + RLS
- CREATE storage bucket `client-documents` (private) + policies

**Create:**
- `supabase/functions/portal-data/index.ts`
- `src/pages/portal/PortalProfile.tsx`
- `src/pages/dashboard/clients/UserUpdateRequests.tsx`

**Edit:**
- `src/pages/portal/PortalDashboard.tsx` — call `portal-data` instead of direct queries
- `src/pages/portal/PortalBills.tsx`, `PortalLedger.tsx`, `PortalNotices.tsx`, `PortalLiveUsage.tsx` — same edge fn
- `src/components/PortalLayout.tsx` (sidebar) — "My Profile" link
- `src/components/TopBar.tsx` — update-request bell badge
- `src/components/AppSidebar.tsx` + `src/App.tsx` — admin update-requests route

## Security

- Portal token signature verify (HMAC) — currently base64 only; will add HMAC with `PORTAL_JWT_SECRET` for future-proof, fallback compatible এই round-এ
- Edge function: service role used **only after** JWT validation + ownership check (user can only access own data)
- Document upload → signed URL with size/type limit (max 5MB, image/pdf only)
- Admin approval required for sensitive changes (NID, photo); plain address/contact auto-apply
- Audit trail in `client_update_requests` — who changed what, when

## ফলাফল

- naeem-এর dashboard-এ সব data দেখাবে (mobile/email blank থাকলে user নিজেই profile page থেকে fill করতে পারবে)
- Billing/invoices দেখাবে, monthly due correctly calculate হবে
- User photo, NID, document upload করতে পারবে → admin notification → approve/reject workflow
- Portal-এর সব read RLS-bypass কিন্তু **secure** (server-side JWT validation)

