# Plan: Impersonation 404 Fix via Configurable Portal Base URL

## Problem
Admin clicks "Login as POP" from `https://ispdesk.ispsector.com/...`. Code opens new tab at `${window.location.origin}/pop-admin/dashboard#imp=...`. The custom domain `ispdesk.ispsector.com` is hosted somewhere (Vercel) without SPA fallback, so deep link returns `404 NOT_FOUND bom1::...` instead of the React app.

## Solution
Add a system setting **Portal Base URL** that admin can configure (e.g. `https://ispdesk.lovable.app`). All impersonation/portal-launch URLs will use this base instead of `window.location.origin`. If unset, fall back to current origin (existing behavior).

## Changes

### 1. New system setting key
- Key: `portal_base_url`
- Stored as `{ url: string }` JSON in existing `system_settings` table.
- No migration needed — table already exists and accepts arbitrary keys.

### 2. New hook: `src/hooks/usePortalBaseUrl.ts`
- Wraps `useSystemSetting('portal_base_url', { url: '' })`.
- Exposes `baseUrl` (trimmed, no trailing slash) and `getPortalUrl(path)` helper that returns `${baseUrl || window.location.origin}${path}`.

### 3. Update `src/lib/impersonate.ts`
- Read `portal_base_url` from `system_settings` directly (since it's a non-React util) before opening the tab.
- Build URL as `${baseUrl || window.location.origin}${redirect}#imp=...`.

### 4. Settings UI
- Add a new card on the existing System Settings / Company setup page (whichever the admin already uses for `company_info`) titled **"পোর্টাল বেস URL"**.
- Single text input + Save button. Helper text in Bangla: "POP/Client/BW portal-এ login করার সময় এই URL ব্যবহার হবে। খালি রাখলে current domain ব্যবহার হবে। উদাহরণ: `https://ispdesk.lovable.app`"
- Validates URL format (must start with `http://` or `https://`, no trailing slash).

### 5. Branded 404 already exists
- `src/pages/NotFound.tsx` was redesigned in the previous turn — no further change needed. It will only show when SPA serves the route. The infrastructure-level 404 (Vercel `bom1::...`) cannot be replaced by app code; the Portal Base URL fix bypasses that origin entirely.

## Files touched
- `src/lib/impersonate.ts` (modify)
- `src/hooks/usePortalBaseUrl.ts` (new)
- One settings page (TBD during implementation — likely `src/pages/dashboard/CompanySetup.tsx` or wherever `company_info` is edited) — add a new card
- No DB migration, no edge function change

## Out of scope
- Fixing the `ispdesk.ispsector.com` DNS / hosting setup (that's an infra change the user does outside Lovable).
- Changing other places that use `window.location.origin` for non-impersonation purposes.
