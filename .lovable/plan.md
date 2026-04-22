

## SMS/Notification Template System — Default + Custom + Multi-tenant Override

### বর্তমান অবস্থা
- একটাই flat table `sms_templates` (id, name, content, type, status, variables) — branch/tenant scoping নেই
- কোনো default seeded template নেই (table এখন empty)
- POP Admin নিজের template দেখতে/বানাতে পারে না (RLS শুধু admin-এর জন্য, আর কোনো branch isolation নেই)
- `BulkSmsDialog`, `Send`, `Individual`, `Templates` — সব direct supabase query করে

### লক্ষ্য
1. **Default templates** — system-protected, delete করা যাবে না, সব tenant-এ auto-load
2. **Custom templates** — system pre-seeded, tenant edit করতে পারবে
3. **POP override** — POP edit করলে তার নিজের copy হবে, master অপরিবর্তিত
4. **Auto-injection** — নতুন POP তৈরি হলে সব default+custom auto-available (no duplication)
5. **Future sync** — admin নতুন master template add করলে সব tenant-এ automatically দেখাবে

---

### Database Design (2-table model)

#### `sms_template_master` (System-level — single source of truth)
| column | type | note |
|--------|------|------|
| `id` | uuid PK | |
| `template_key` | text UNIQUE | e.g. `bill_reminder`, `otp_verify`, `welcome` — stable identifier |
| `name` | text | display name |
| `content` | text | message body with `{variables}` |
| `template_type` | text | `default` / `custom` |
| `category` | text | `billing`, `otp`, `registration`, `payment`, `support`, `general` |
| `variables` | jsonb | `["UserName","MonthlyBillAmount",...]` |
| `is_protected` | bool | true = cannot delete (default templates) |
| `is_active` | bool | |
| `created_by` | uuid | super admin who added |
| `created_at`, `updated_at` | timestamptz | |

#### `sms_template_overrides` (Per-tenant override layer)
| column | type | note |
|--------|------|------|
| `id` | uuid PK | |
| `master_id` | uuid FK → master | which master template this overrides |
| `branch_id` | uuid FK → branches | NULL = admin-level override; set = POP-level |
| `name` | text | overridden name (nullable → fallback to master) |
| `content` | text | overridden content |
| `is_active` | bool | tenant can disable a template locally |
| `updated_by` | uuid | |
| `created_at`, `updated_at` | timestamptz | |
| UNIQUE | (master_id, branch_id) | one override per tenant per master |

**কেন এই design**: master কখনো duplicate হয় না, override-table শুধু changed rows রাখে। নতুন master add হলে auto সব tenant দেখবে (no sync job লাগবে — read-time merge)। Tenant edit করলে শুধু override row insert/update হয়।

#### `sms_templates` (legacy table)
- পুরোনো data (যদি থাকে) one-time migrate করে `sms_template_master`-এ move হবে
- table পরে drop হবে (এই plan-এ deprecation only — actual drop পরের step-এ)

---

### Auto-injection Logic
**নতুন POP তৈরি হলে কোনো row insert হয় না** — কারণ override-table empty থাকলেও POP master-এর সব template দেখবে (read-time merge)। ফলে:
- কোনো duplication নেই
- নতুন master add হলে instantly সব tenant দেখবে
- POP যখন edit করবে শুধু তখনই override row তৈরি হবে

এটাই scalable approach — explicit "seed on POP create" trigger লাগবে না।

---

### Read-time Merge Logic (single SQL view)
```sql
CREATE VIEW sms_templates_effective AS
SELECT 
  m.id as master_id,
  m.template_key,
  COALESCE(o.name, m.name) as name,
  COALESCE(o.content, m.content) as content,
  m.template_type,
  m.category,
  m.variables,
  m.is_protected,
  COALESCE(o.is_active, m.is_active) as is_active,
  o.branch_id,
  (o.id IS NOT NULL) as is_overridden
FROM sms_template_master m
LEFT JOIN sms_template_overrides o ON o.master_id = m.id;
```
Frontend একটাই query করবে, branch_id filter দিয়ে। NULL branch + own branch overrides merge হবে।

---

### Default Templates Seed (master-এ initial insert)
| key | category | content snippet |
|-----|----------|-----------------|
| `welcome` | registration | প্রিয় {UserName}, আমাদের ISP-এ স্বাগতম। ID: {ClientId}, Pass: {Password} |
| `bill_reminder` | billing | প্রিয় {UserName}, আপনার {Month} মাসের বিল {MonthlyBillAmount} টাকা — শেষ তারিখ {BillingLastDate} |
| `bill_overdue` | billing | প্রিয় {UserName}, {Due} টাকা বকেয়া — দ্রুত পরিশোধ করুন |
| `payment_received` | payment | {UserName}, {Amount} টাকা পেমেন্ট গৃহীত। বাকি: {Due} |
| `otp_verify` | otp | আপনার OTP: {OTP} — ৫ মিনিট valid |
| `connection_active` | registration | {UserName}, আপনার connection active। Username: {Username}, Password: {Password} |
| `connection_disabled` | billing | {UserName}, বিল বকেয়ার কারণে আপনার connection disabled |
| `ticket_created` | support | Ticket #{TicketId} — {Subject} — শীঘ্রই যোগাযোগ করা হবে |
| `ticket_resolved` | support | Ticket #{TicketId} resolved — ধন্যবাদ |
| `package_change` | billing | {UserName}, package পরিবর্তন: {OldPackage} → {NewPackage} |

সবগুলো `template_type='default'`, `is_protected=true`।

---

### RLS Policies
- **`sms_template_master`**: SELECT = সবাই (admin + portal); INSERT/UPDATE/DELETE = super_admin/admin only। DELETE-এ trigger যা `is_protected=true` হলে raise exception দেবে।
- **`sms_template_overrides`**: 
  - Admin: full access on rows where `branch_id IS NULL`
  - POP: full access on rows where `branch_id = own branch_id` (via portal edge function — RLS check via has_role + branch match)

---

### Edge Function actions (in `portal-data/index.ts`)
| Action | কাজ |
|--------|-----|
| `pop_list_templates` | master + own override merge → effective list |
| `pop_save_template_override` | master_id + new content/name/is_active → upsert override (own branch) |
| `pop_reset_template` | own branch override delete → fallback to master |

POP delete করতে পারবে না (master untouchable); শুধু override remove করে reset পাবে।

---

### Frontend Changes
| File | কাজ |
|------|-----|
| `src/pages/dashboard/sms/Templates.tsx` | new master + override UI; "Default" badge; protected ones-এ delete disable |
| `src/pages/reseller/PopSmsTemplates.tsx` (new) | POP-side template manager — same UI, callPortal-based |
| `src/pages/dashboard/sms/Send.tsx`, `Individual.tsx`, `BulkSmsDialog.tsx` | switch from `sms_templates` table → `sms_templates_effective` view (admin) / `pop_list_templates` action (POP) |
| `src/App.tsx` | wire `/pop-admin/sms/templates` route |
| Reseller sidebar | "এসএমএস টেমপ্লেট" link |

---

### Variable system
Centralized list:
```
{UserName} {ClientId} {Username} {Password}
{MonthlyBillAmount} {Due} {BillingLastDate} {Month}
{Amount} {OTP} {TicketId} {Subject} {Package} {OldPackage} {NewPackage}
```
Render time-এ token replace হবে (utility function `src/lib/templateVars.ts`).

---

### ফলাফল
- নতুন POP তৈরি হলে instantly সব default + custom template available — কোনো manual setup নেই, কোনো duplicate row নেই
- POP edit করলে master অপরিবর্তিত — শুধু তার override layer change হয়
- Admin master update করলে সব POP যাদের override নেই, তারা নতুন version দেখবে (auto-sync)
- Default templates protected — POP/admin কেউ delete করতে পারবে না, শুধু edit (override) বা disable
- Scalable: 1000 POP × 50 template = 50,000 row নয়, শুধু যেগুলো actually customize হয়েছে সেগুলোই rows
- Use cases: Billing reminder, OTP, registration, payment receipt, support — সব pre-seeded

### Files to create/edit
- **Migration**: create `sms_template_master`, `sms_template_overrides`, view `sms_templates_effective`, RLS policies, protect-trigger, seed 10 default templates
- **Insert (data)**: legacy `sms_templates` rows (যদি থাকে) → master-এ port
- `supabase/functions/portal-data/index.ts` — 3 new actions
- `src/pages/dashboard/sms/Templates.tsx` — master+override aware UI
- `src/pages/reseller/PopSmsTemplates.tsx` — new POP page
- `src/pages/dashboard/sms/Send.tsx`, `Individual.tsx` — use effective view
- `src/components/billing/BulkSmsDialog.tsx` — POP-aware fetch
- `src/lib/templateVars.ts` — variable list + render utility
- `src/App.tsx` — POP template route

### Technical notes
- Old `sms_templates` table data port হবে, table এই step-এ drop হবে না (safety)
- RLS loosen না — POP write portal edge function-এ branch enforced
- View use করায় frontend code minimal change
- `sms_templates` foreign key (e.g. `sms_log.template_id`) কাজ চালু রাখতে FK migrate হয়ে master_id-তে point করবে

