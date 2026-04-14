

## Plan: System Settings Pages — Company Setup, System Setup, and Related Pages

### Overview
Implement the placeholder System pages (Company Setup, System Setup, Invoice Setup, Periods Setup, Email Setup, Payment Gateways, Processing Fee) as functional settings pages. Since the user said "later I will provide extra logic", we'll build a solid, extensible settings framework now.

### Database
**Migration required** — Create a `system_settings` table (similar pattern to `hr_settings`):
- `id` (uuid, PK)
- `setting_key` (text, unique) — e.g. `company_info`, `invoice_config`, `email_config`, `billing_periods`
- `setting_value` (jsonb, default `'{}'`)
- `created_at`, `updated_at` (timestamptz)
- RLS: authenticated users can read, admins can update

### Implementation

**1. Company Setup (`Company.tsx`)**
- Form-based page (not raw JSON): Company Name, Address, Phone, Email, Logo URL, Website, TIN/BIN
- Saves to `system_settings` with key `company_info`
- Upload logo option (using existing storage)

**2. System Setup (`Setup.tsx`)**
- Key-value settings cards: Currency, Timezone, Date Format, Language, Default Billing Cycle
- Saves to `system_settings` with key `system_config`

**3. Invoice Setup (`Invoice.tsx`)**
- Invoice prefix, next number, padding, footer text, terms & conditions
- Live preview of invoice number format (like HR Settings)
- Key: `invoice_config`

**4. Periods Setup (`Periods.tsx`)**
- Billing period configuration: cycle type (monthly/quarterly/yearly), billing day, grace period days
- Key: `billing_periods`

**5. Email Setup (`Email.tsx`)**
- SMTP settings form: Host, Port, Username, Password (masked), From Email, From Name, Encryption (TLS/SSL)
- Test email button (placeholder for edge function)
- Key: `email_config`

**6. Payment Gateways (`PaymentGateways.tsx`)**
- Toggle-based cards for each gateway (bKash, Nagad, Rocket, SSLCommerz, etc.)
- Each with API Key, Secret fields, active toggle
- Key: `payment_gateways`

**7. Processing Fee (`SysProcessingFee.tsx`)**
- Fee type (flat/percentage), amount, applicable services
- Key: `processing_fee_config`

All pages use the same pattern: load from `system_settings` by key, form inputs, save button. Bangla UI labels throughout.

### Files to Edit (8)
- `src/pages/dashboard/system/Company.tsx`
- `src/pages/dashboard/system/Setup.tsx`
- `src/pages/dashboard/system/Invoice.tsx`
- `src/pages/dashboard/system/Periods.tsx`
- `src/pages/dashboard/system/Email.tsx`
- `src/pages/dashboard/system/PaymentGateways.tsx`
- `src/pages/dashboard/system/SysProcessingFee.tsx`
- Migration: create `system_settings` table

