# পে-রোল (PayRoll) Module Plan

বর্তমান `Payroll.tsx` শুধু template + payhead assign করতে দেয়। নতুন design-এ ৩টা concept লাগবে: **PayRoll**, **Periods**, **Assigned PayHeads**। নিচের plan ঠিক screenshot-গুলোর মতই কাজ করবে।

## ১. Database (migration)

`payroll_templates` কে PayRoll হিসেবে ব্যবহার করব, ২টা নতুন column + ১টা নতুন table:

```text
ALTER payroll_templates:
  + payroll_type      text   (Monthly|Weekly|Daily|Quarterly|Annual|Bi_Annual|Tri_Annual|One_Time)
  + payment_type      text   (Cash|bKash|Bank|Rocket|Nagad|SSL Commerz|...|Other)
  + is_default        boolean default false

NEW payroll_periods:
  id, payroll_id (FK payroll_templates), period_type,
  period_name text, start_date date, end_date date, issue_date date,
  created_at
```

GRANT + RLS (authenticated read/insert/update/delete, service_role all)। ১টা `payroll_template_payheads` ইতিমধ্যেই আছে — reuse।

**Seed:** ১টা default row — name `Monthly Payroll`, payroll_type `Monthly`, payment_type null; এবং বর্তমান সব active payheads কে এই payroll-এ amount=0 দিয়ে assign।

## ২. পেজ: `src/pages/dashboard/hr/Payroll.tsx` (rewrite)

Screenshot-১ এর মত table:

```text
Serial | PayRoll Name | Payroll Type | Payment Type | Action
                                                    [Assign Period] [Assign PayHead] [Edit]
[+ New PayRoll]
```

### a) New / Edit PayRoll dialog (screenshot-২)
Fields: **Payroll Name\***, **Payroll Type\*** (dropdown: Monthly/Weekly/Daily/Quarterly/Annual/Bi_Annual/Tri_Annual/One_Time), **Payment Type** (dropdown: Cash, bKash, Bank, Rocket, Nagad, SSL Commerz, Foster Payments, Walletmix, SureCash, MCash, UCash, aamarPay, PhonePe, Razorpay, Stripe, Other)।

### b) Assign Period dialog (screenshot-৩,৫,৬,৭)
- যদি `period_type` set না থাকে → শুধু "Type" dropdown + **Assign Periods** button (screenshot-৩)।
- Type select করার পর সাল-ভিত্তিক periods auto-generate করে editable form-এ দেখাবে (Period Name, Start Date, End Date, Issue Date)। **Update Periods** button save করবে।

**Auto-generation rule:**
| Type | কতটা period | Period Name pattern |
|---|---|---|
| Monthly | 12 (current year) | `Jan-25`, `Feb-25`… |
| Weekly | পুরো বছরের weeks; মাসের শেষ chunk = বাকি দিন (`22 - 31 Jan 2025 (10 days)`) | range + (N days) |
| Quarterly | 4 | `Jan-25 To Mar-25` ইত্যাদি |
| Annual | 1 | `2025` |
| Bi_Annual | 2 | `Jan-25 To Jun-25`, `Jul-25 To Dec-25` |
| Tri_Annual | 3 | 4-মাসের blocks |
| Daily | চলতি মাসের প্রতিদিন | `01 Jan 2025` |
| One_Time | 1 | user দেয় |

Issue Date = end_date + 1 day (default, editable)।

Save: existing periods delete করে নতুন set insert (simpler than diffing)।

### c) Assign PayHead dialog (screenshot-৪)
- Top row: **PayHead** dropdown (active payheads), **Type** (Amount/Percentage), **Amount/Unit**, **Assign PayHead** button → `payroll_template_payheads` এ insert।
- নিচে assigned list: Name | editable Amount input | Type badge (Addition/Deduction — payheads.type থেকে) | Amount/Percentage | value | trash।
- Inline amount edit → update mutation।
- Bottom: **Grand Total** (sum addition − sum deduction)।

## ৩. UI/বাংলা labels
Heading **"পে-রোল"**, sidebar group **"Configuration"** এ আছে আগে থেকেই, রাখব।

## ৪. কাজের ক্রম
1. Migration: alter table + new `payroll_periods` table + GRANT/RLS + seed default Monthly Payroll with all payheads (amount 0)।
2. `Payroll.tsx` rewrite — list + 3 dialogs।
3. Period generator utility (`src/lib/payrollPeriods.ts`)।
4. Verify: build clean, default row দেখায়, period generation সঠিক।

## প্রশ্ন
পিরিয়ড generate করার সময় কোন বছর ধরে নেব? — **চলতি বছর (2026)** default, screenshot-এ দেখানো dates editable থাকবে — ঠিক আছে?
