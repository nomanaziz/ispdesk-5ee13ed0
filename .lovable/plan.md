

## POP (Branch Manager) System — Full Implementation

### লক্ষ্য

দুটি image অনুযায়ী পূর্ণাঙ্গ POP system:
1. **Add POP page** — Personal Info + Business/Login Info + Permission menu (multi-section form, image-1)
2. **POP List page** — stats cards, filters, big table with toggles, action menu (image-2)
3. **POP View page** — tabbed profile view (image-3)
4. **Prepaid/Postpaid billing logic** + Fund Start workflow

### ১. DB Migration

**`branch_managers`-এ নতুন columns:**
- `pop_code text unique` — auto: 0001, 0002, …
- `pop_prefix text` — Mikrotik username prefix (ex: AB1)
- `set_prefix_mikrotik boolean default false`
- `pop_type text default 'prepaid'` — prepaid / postpaid
- `phone text`, `national_id text`
- `district_id uuid`, `upazila_id uuid`, `zone_id uuid`
- `logo_url text`
- `disable_clients boolean default true` ("Want to disable clients?")
- `min_balance numeric default 0`
- `fund_started boolean default false` — first off, on করলে পরের রাত থেকে billing
- `fund_started_at timestamptz`
- `is_locked boolean default false`
- `client_create_permission boolean default true`
- `pop_level int default 1`
- `permissions jsonb default '{}'` — menu permissions object

**নতুন table — `pop_permissions_template`** (optional reference):
- কোন কোন menu key allow করা যায় তার master list (পরে seed)

**নতুন table — `pop_transactions`** (debit/credit log):
- `id, pop_id, type ('debit'|'credit'|'fund_deduction'), amount, balance_after, description, created_by, created_at`

**`reseller_tariffs`-এ already আছে** `selling_rate`, `activation_days`, `min_activation_days`, `is_daily_recharge` — এগুলোই prepaid/postpaid logic-এ ব্যবহার হবে।

### ২. Page Structure

#### A. `AddManager.tsx` — সম্পূর্ণ Redesign (image-1 অনুসরণে)

তিনটি Card section:

**Card 1 — Personal Information**
Contact Person Name*, Email*, Mobile*, Phone, National ID, District*, Upazila*, Zone*, POP Code* (auto), POP Prefix, Set Prefix in Mikrotik?, **POP Type*** (prepaid/postpaid), Min Rechargeable Amount*, Address*, POP Logo (upload)

**Card 2 — Business & Login Information**
POP/Business Name*, Tariff Name* (reseller_tariffs select), Want to Disable Clients? (yes/no), Minimum Balance, **Username***, **Password***, **Confirm Password***

**Card 3 — POP Menus (Permission Tree)**
Checkbox tree — group → child items। "Select All Menus" toggle। Default-এ payment gateway-related সব unchecked, বাকি basic menus checked। Saved as `permissions` jsonb।

Permission groups (admin website-এর mirror):
- Configuration (Zone, Package, District, Upazila, Department, SubZone, Box, Device)
- Mikrotik Client
- Employee (Add, List, Salary)
- Client (Add, List, Left, Scheduler, Change Request, Portal Manage)
- Billing (List, Invoice, Daily Collection) — **Payment Gateway excluded**
- Monitoring (Client Monitoring)
- Client Support (Category, Daily/Monthly Complaint)
- SMS Service (Template, Individual, Group, Gateway)
- Reports (BTRC, Enable/Disable, Bill Collection, Messages, Processing Fee)
- Fund History (Debit, Credit)
- Tutorials

#### B. `Managers.tsx` (POP List) — Full Rebuild (image-2 অনুসরণে)

**Top stats cards (3):**
- Total POPs
- Total POP Clients (sum)
- Online Clients

**Filters row:** Fund Start, POP Type, Login Status, Client Enabled, POP Status, Creation From/To

**Table columns:** Code, POP Name, POP Type (badge), ContactPerson, Server Name, Mobile, Company Name, Level, TariffName, Clients(Running), Clients(Enabled), Clients(Disabled), Clients(Left), RemainingFund, **ClientEnabled toggle**, **FundStart toggle**, **IsLocked toggle**, Action menu (3-dots)

**Action dropdown:** View, Edit, Login as POP, Password Regenerate, Fund Deduction, POP Type Change, Send Email/Message, Delete

#### C. নতুন `PopProfile.tsx` (image-3) — `/dashboard/branches/pop/:id`

Left card: avatar, name, address, email, POP Code, mobile, running/left clients, remaining balance, Client Create Permission toggle, Set Prefix toggle, joining date, address, action buttons (Update, Send Email, POP Type Change, Password Regenerate, Login As POP, Add POP Client, Go to POPs)

Right tabs:
- **POP Information** — Service Info + Personal Info + Fund Info At A Glance (image-3 layout)
- **Exported Clients** — clients বর্তমানে assigned
- **Unexported Clients** — clients এ POP-এর অধীনে নেই
- **Debited/Credited Transactions** — pop_transactions table
- **POP Change Logs** — audit trail
- **POP Fund Start Logs**
- **POP Online Clients**

### ৩. Billing Logic (Edge function update)

`generate-monthly-billing` / `enforce-billing` update:
- POP-এর `pop_type='prepaid'` হলে → POP-এর প্রতিটি client-এর জন্য **daily** balance থেকে `selling_rate / activation_days` deduct (e.g., ৳230/30 = ৳7.67/day)
- `postpaid` হলে → daily auto-deduct **নেই**, monthly-end-এ একবার bill
- `fund_started=false` হলে কোনো deduction নয়
- POP balance < `min_balance` এবং `disable_clients=true` হলে → POP-এর সব client disabled

### ৪. Routes (`App.tsx`)

```
/dashboard/branches/managers       → POP List (rebuilt)
/dashboard/branches/add-manager    → Add POP (3-card form)
/dashboard/branches/pop/:id        → POP Profile (tabbed view)
```

### ৫. Files

| File | Action |
|------|--------|
| migration | branch_managers + pop_transactions schema |
| `src/pages/dashboard/branches/AddManager.tsx` | Full rebuild — 3-section form + permission tree |
| `src/pages/dashboard/branches/Managers.tsx` | Full rebuild — stats, filters, toggles, action menu |
| `src/pages/dashboard/branches/PopProfile.tsx` | **নতুন** — tabbed profile (image-3) |
| `src/components/branches/PopActionMenu.tsx` | **নতুন** — dropdown action (login-as, regen, etc.) |
| `src/components/branches/FundDeductionDialog.tsx` | **নতুন** |
| `src/components/branches/PasswordRegenerateDialog.tsx` | **নতুন** |
| `src/components/branches/PermissionTreeSelector.tsx` | **নতুন** — checkbox tree |
| `src/App.tsx` | `/branches/pop/:id` route mount |
| `supabase/functions/enforce-billing/index.ts` | prepaid/postpaid daily logic |
| storage bucket | `pop-logos` (public) |

### Approach

- **Phase 1 (এখন):** DB migration, Add POP form, POP List rebuild, POP Profile basic view, Action dropdown (delete/edit/view/login-as/password-regenerate/fund-deduction), permissions JSON storage
- **Phase 2 (পরে):** Billing engine prepaid logic, Reseller portal-এ permission enforcement (menu rendering check), fund start log audit table

- Permission enforcement: Phase 1-এ store হবে; Phase 2-এ ResellerLayout-এ check করে menu render হবে
- "Login as POP" → admin তার session preserve করে reseller token issue করে নতুন tab-এ `/reseller/dashboard` খুলবে
- Bangla labels, compact spacing (Vuexy-inspired)

