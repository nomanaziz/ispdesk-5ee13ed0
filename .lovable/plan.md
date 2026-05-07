
# Phase 2 — My Subscription Page

## Goal
Logged-in admin/POP নিজের panel subscription details দেখতে পারবে: package/tier, user limit vs active count, expiry, estimated bill, renew option.

## Link strategy (Both fallback)
1. First try: `profiles.branch_id` → match `bw_sale_customers.panel_branch_id`
2. Fallback: `profiles.email` → match `bw_sale_customers.customer_email`
3. কিছু না পেলে empty state ("No subscription linked — contact admin")

## New files
- `src/pages/MySubscription.tsx` — main page
- `src/hooks/useMySubscription.ts` — React Query hook (both lookups)
- `src/components/subscription/SubscriptionSummaryCard.tsx`
- `src/components/subscription/UsageMeter.tsx` (active vs limit progress bar)
- `src/components/subscription/RenewDialog.tsx` (records intent in `bw_sale_invoices` as pending or opens manual contact)

## Display
- Customer name, panel branch
- Current tier (`current_tier_id` → `bw_panel_pricing_slabs.name`, billing_mode, rate)
- `panel_user_limit` vs `active_client_count` (with %)
- `panel_subscription_expires_at` — days remaining + status badge (Active / Expiring soon ≤7d / Expired)
- `next_month_estimated_bill`
- Recent invoices list (last 6) from `bw_sale_invoices` filtered by customer_id
- Last payment from `bw_sale_invoices` where status='paid'

## Routing & nav
- Route: `/dashboard/my-subscription` in `App.tsx`
- Sidebar: add "My Subscription" item (CreditCard icon) under existing account/settings group
- TopBar user dropdown: add "My Subscription" link

## DB
No schema changes — all data exists in `bw_sale_customers`, `bw_panel_pricing_slabs`, `bw_sale_invoices`.

---

# Phase 3 — Multi-Tenant Custom Domain (Own VPS + Caddy)

## Architecture
```text
Customer DNS (CNAME) ──▶ ispdesk.app VPS (Caddy)
                              │  on-demand TLS (Let's Encrypt)
                              │  ask endpoint → verify domain in DB
                              ▼
                         App container (tenant resolved by Host header)
```

## DB changes (migration)
New table `tenant_domains`:
- `id uuid pk`
- `tenant_id uuid` (→ `bw_sale_customers.id` or `branches.id` — will use `bw_sale_customers.id` since that's the tenant root)
- `domain text unique not null` (lowercased, no protocol)
- `verification_token text not null` (random, for TXT record)
- `status text` enum: `pending` | `verifying` | `verified` | `active` | `failed`
- `is_primary bool default false`
- `last_checked_at timestamptz`
- `error_message text`
- `created_at`, `updated_at`
- RLS: tenant can read/manage own rows (via `panel_branch_id` join), admins all

Public read-only RPC `get_tenant_by_domain(_domain text)` returning tenant_id (used by Caddy ask endpoint and frontend host detection). SECURITY DEFINER, returns only `verified`/`active` rows.

## Edge functions
1. `verify-custom-domain` — given domain row id:
   - DNS lookup CNAME → expects `edge.ispdesk.app` (configurable)
   - DNS lookup TXT `_lovable_verify.<domain>` → matches `verification_token`
   - On success: status → `verified`
2. `caddy-ask` — public GET `?domain=foo.com` returns 200 if domain is `verified`/`active` (Caddy's on_demand TLS ask endpoint), 404 otherwise

## Frontend
- Route: `/dashboard/system/custom-domain`
- New files:
  - `src/pages/system/CustomDomainPage.tsx`
  - `src/components/domains/DomainList.tsx`
  - `src/components/domains/AddDomainDialog.tsx`
  - `src/components/domains/DnsInstructions.tsx` (shows CNAME + TXT records to add)
  - `src/components/domains/VerifyButton.tsx` (calls edge function)
- Sidebar: under System group, "Custom Domain" item

## Tenant resolution
- Update `src/lib/tenant.ts` (or create) to detect `window.location.hostname`
- If hostname not `*.ispdesk.app`, call `get_tenant_by_domain` RPC → set tenant context
- Existing subdomain logic remains as fallback

## Infra (documented for ops, not in repo)
- VPS Caddyfile snippet with `on_demand_tls { ask https://<project>.functions.supabase.co/caddy-ask }` and wildcard reverse_proxy to app
- Customer DNS instructions: `CNAME @ → edge.ispdesk.app` + `TXT _lovable_verify → <token>`
- Add a markdown doc `docs/custom-domain-setup.md` for ops team

## Out of scope (future)
- Multiple primary domains per tenant (single primary enforced)
- Wildcard subdomain per tenant
- Email DNS (MX/SPF/DKIM) — separate task

## Execution order
1. Phase 2 first (small, self-contained)
2. Phase 3 DB migration → edge functions → UI → tenant resolution
3. Hand off Caddy/VPS config to ops separately
