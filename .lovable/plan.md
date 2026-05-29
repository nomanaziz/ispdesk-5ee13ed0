# Phase-2 Plan (Sequential)

তিনটা বড় feature ক্রমান্বয়ে implement করব। প্রতিটা step আলাদা migration + code change।

---

## Step 1 — Global Unique Client Code (UID)

**Goal:** সব client/customer/employee এর একটা unified global UID থাকবে, কারও সাথে কারও মিলবে না।

**Format:** `{TYPE}-{TENANT_SHORT}-{SEQ6}`
- TYPE: `CLI` (ISP client), `BWC` (BW sale customer), `EMP` (employee), `RSL` (reseller/POP)
- TENANT_SHORT: tenant_id এর প্রথম ৪ char (uppercase)
- SEQ6: per-tenant sequence, 6-digit zero-padded

**Example:** `CLI-A7F3-000142`, `EMP-A7F3-000007`

**DB changes (migration #1):**
1. Add `uid TEXT UNIQUE` column to: `clients`, `bw_sale_customers`, `employees`, `branch_managers`
2. Create `public.global_uid_seq` per-tenant sequence table: `(tenant_id uuid, type text, last_seq int, PRIMARY KEY(tenant_id,type))`
3. Function `public.generate_global_uid(_type text, _tenant_id uuid) → text` — atomically bumps sequence and returns formatted UID
4. BEFORE INSERT triggers on the four tables to auto-fill `uid` if NULL
5. Backfill existing rows with UIDs (one-time UPDATE)
6. Add indexes on `uid` columns

**Code changes:**
- `src/lib/uid.ts` — helper to display/parse UID
- Show `uid` column in: `ClientList`, `BwSaleCustomers`, `Employees`, `PopManagement` tables
- Add "UID" to client/employee detail pages and bill receipts

---

## Step 2 — BW Tenant Client Portal

**Goal:** BW tenant (reseller) এর under-এ থাকা ISP clients দের জন্য branded portal at tenant subdomain।

**Existing:** `tenant_domains` table আছে, `get_tenant_by_domain()` function আছে। Generic `/portal/dashboard` আছে।

**Changes:**
1. New route `/t/:tenantSlug/portal/login` — branded login with tenant logo/name resolved via `get_tenant_by_domain` (or slug lookup)
2. New route `/t/:tenantSlug/portal/dashboard` — show client info, bills, payment, UID
3. Reuse existing portalLogin edge function but scope to `branch.tenant_id = tenant`
4. Add `tenant_branding` columns to `bw_sale_customers`: `logo_url`, `brand_color`, `portal_title`
5. `BwTenantPortalLayout.tsx` — applies tenant branding (logo, color)

**Migration #2:** Add branding columns + RLS for public read of branding (anon SELECT on safe columns only).

---

## Step 3 — Per-Reseller (POP) White-Label Portal

**Goal:** প্রতি reseller/POP এর নিজস্ব branded portal তাদের নিজস্ব clients দের জন্য।

**Changes:**
1. Add `portal_slug TEXT UNIQUE`, `portal_logo_url`, `portal_brand_color`, `portal_title` to `branch_managers`
2. New routes:
   - `/r/:resellerSlug/login` — POP-branded client login
   - `/r/:resellerSlug/portal` — POP-branded client dashboard
3. `ResellerPortalLayout.tsx` — applies POP branding
4. POP Admin > Settings এ new "Portal Branding" tab — slug, logo upload, color picker
5. Edge function update: scope login lookup to `client.branch_id IN (POP's branches)`

**Migration #3:** Add branding columns + slug uniqueness + storage bucket `reseller-branding` (public read, owner write).

---

## Order of execution

আমি এই plan approve হলে **Step 1 (Global UID) এর migration** দিয়ে শুরু করব, approve হলে code change, তারপর Step 2 migration ও code, তারপর Step 3। প্রতি step শেষে আপনাকে update দিব।

## Risks / Notes
- Backfill UID for existing rows — যদি tens of thousands rows থাকে, batch update লাগতে পারে
- Storage bucket `reseller-branding` সব reseller-এর জন্য shared, path-based isolation: `{reseller_id}/logo.png`
- `portal_slug` reserved words ('admin', 'api', 'dashboard') block করতে হবে
- Bangla menu/UI throughout new portals
