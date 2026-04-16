

## Unified Login System (সব ধরনের User-এর জন্য)

### সমস্যা

বর্তমানে দুটি আলাদা login page আছে এবং reseller-এর কোনো login নেই:

| User Type | Login Page | Method |
|-----------|-----------|--------|
| Admin/Staff | `/login` | Email + password (Supabase auth) |
| Client (PPP user) | `/portal/login` | PPP Username/Client Code + password |
| BW Sale Customer | `/portal/login` | Username + password |
| **Reseller (POP/Branch Manager)** | ❌ **নেই** | — |
| **MAC Reseller** | ❌ **নেই** | — |

User চান — একটাই login page (`/login`) যেখান থেকে **সব ধরনের user** তাদের credentials দিয়ে login করতে পারবে।

### সমাধান — Smart Universal Login

`/login` page-কে **smart router** বানাব। User input বুঝে নিয়ে সঠিক জায়গায় auth করবে এবং সঠিক জায়গায় redirect করবে।

#### Login Detection Logic

User শুধু **Username/Email** আর **Password** input দেবে। System order-এ check করবে:

```
1. Input "@" আছে? → Admin/Staff (Supabase auth) → /dashboard
2. clients table-এ username/client_id match? → Client portal → /portal/dashboard
3. branch_managers (resellers) table-এ contact/email/code match? → Reseller portal → /reseller/dashboard
4. bw_sale_customers table-এ username match? → BW portal → /portal/dashboard (bw view)
5. কিছু না মিললে → "Invalid credentials" error
```

### পরিবর্তন সমূহ

#### 1. DB Migration — Reseller-এ login fields যোগ
- `branch_managers`-এ `username text unique`, `password text`, `portal_enabled boolean default true` যোগ
- বর্তমান reseller-দের জন্য default username = `client_code` বা `contact`

#### 2. Edge Function `portal-auth` Update
- নতুন detection branch: clients fail হলে → **branch_managers** check করবে (`username`, `client_code`, `contact`, `email` যেকোনো একটায় match)
- Token-এ `type: "reseller"` যোগ
- Reseller-এর জন্য token payload-এ `branch_id`, `balance`, `tariff_id` ইত্যাদি

#### 3. `Login.tsx` — Universal Login Form
- Label পরিবর্তন: "ইমেইল" → **"ইমেইল / ইউজারনেম / PPP ID"**
- Submit handler-এ দুই-step logic:
  - Input-এ `@` থাকলে → Supabase `signIn()` → success হলে `/dashboard`
  - নাহলে → portal-auth edge function call → token-এর `type` দেখে redirect:
    - `client` / `bw_customer` → `/portal/dashboard`
    - `reseller` → `/reseller/dashboard`
- Loading/error handling বাংলায়

#### 4. `/portal/login` Route
- Backwards compatibility-র জন্য রাখব, কিন্তু সেটা `/login`-এ redirect করবে
- বা UI-তে ছোট link: "এখানে সব user login করতে পারে"

#### 5. Reseller Portal (basic skeleton)
- `/reseller/login` removed (use `/login`)
- `/reseller/dashboard` — minimal page (balance, tariff, client count)
- `ResellerProtectedRoute` + `ResellerLayout` (PortalLayout-এর মতো, but reseller-specific menu)
- Phase 1-এ শুধু dashboard + logout — পরে invoices/clients/etc যোগ হবে

#### 6. `PortalAuthContext` Update
- Customer type field: `"client" | "bw_customer" | "reseller"` discriminator হবে
- Type-aware রকম helper

### Files

| File | Change |
|------|--------|
| migration | `branch_managers`-এ `username`, `password`, `portal_enabled` যোগ; existing-দের জন্য default fill |
| `supabase/functions/portal-auth/index.ts` | Reseller branch যোগ — branch_managers query + token type |
| `src/pages/Login.tsx` | Universal input, smart routing, বাংলা label |
| `src/contexts/PortalAuthContext.tsx` | `type` field expand, reseller support |
| `src/pages/portal/PortalLogin.tsx` | `/login`-এ redirect (deprecated) |
| `src/components/ResellerProtectedRoute.tsx` | **নতুন** — reseller route guard |
| `src/components/ResellerLayout.tsx` | **নতুন** — reseller portal layout |
| `src/pages/reseller/ResellerDashboard.tsx` | **নতুন** — basic dashboard (balance, stats) |
| `src/App.tsx` | `/reseller/*` routes mount, `/portal/login` → `/login` redirect |

### Approach & Notes

- **Phase 1** (এখন): Universal login + reseller basic dashboard
- **Phase 2** (পরে): Reseller-এর full portal (clients manage, recharge, invoices) — যখন বলবেন
- **Security note**: Reseller/client password বর্তমানে **plain text**-এ আছে DB-তে। Production-এ এটা bcrypt hash করা উচিত — Phase 2-এ সেটাও handle করব
- Admin login (Supabase auth) আগের মতোই কাজ করবে — শুধু same form থেকে route হবে
- কেউ reseller create করার সময় Manager add form-এ username/password set করতে পারবে (পরে Managers.tsx update করব)

