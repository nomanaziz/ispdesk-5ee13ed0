

## Test User Creation — সব Portal-এর জন্য

আপনার test করার জন্য প্রতিটি portal-এ একটা করে user create করে দেব sample credentials সহ।

### তৈরি হবে যে User-গুলো

| # | User Type | Login Page | Username | Password | Redirect To |
|---|-----------|------------|----------|----------|-------------|
| 1 | **Admin** | `/login` | (আপনার আছে) | — | `/dashboard` |
| 2 | **Employee** | `/login` | `employee@test.com` | `Test@1234` | `/dashboard` (limited) |
| 3 | **Reseller (POP/MAC)** | `/login` | `reseller01` | `123456` | `/reseller/dashboard` |
| 4 | **Bandwidth Reseller** | `/login` | `bwcustomer01` | `123456` | `/portal/dashboard` |
| 5 | **Client** | `/login` | `client01` | `123456` | `/portal/dashboard` |

### Step-by-Step Plan

**1. Employee User তৈরি**
- Supabase Auth-এ `employee@test.com` / `Test@1234` দিয়ে user create
- `profiles` table-এ row auto-create হবে (trigger আছে)
- `user_roles` table-এ `operator` role assign
- `employees` table-এ একটা demo employee record (নাম, designation, branch ইত্যাদি)

**2. Reseller (POP) তৈরি**
- `branch_managers` table-এ insert:
  - `name`: "Demo POP Reseller"
  - `username`: `reseller01`
  - `password`: `123456`
  - `client_code`: auto via `pop_code` sequence
  - `pop_type`: `prepaid`
  - `balance`: `5000` (testing-এর জন্য কিছু balance)
  - `portal_enabled`: true
  - `status`: `Active`
  - `permissions`: default permissions (payment gateway বাদে সব)
  - `email`, `contact`, `address` demo values

**3. Bandwidth Reseller তৈরি**
- `bw_sale_customers` table-এ insert:
  - `customer_name`: "Demo BW Reseller"
  - `customer_code`: `BW001`
  - `username`: `bwcustomer01`
  - `password`: `123456`
  - `activity_status`: `Active`
  - `email`, `mobile`, `contact_person`, `address` demo values

**4. Client (PPP user) তৈরি**
- `clients` table-এ insert:
  - `name`: "Demo Client"
  - `client_id`: `CL001`
  - `username`: `client01`
  - `password`: `123456`
  - `billing_status`: `Active`
  - একটা existing package/branch/zone-এ assign (DB থেকে read করে নেব)
  - `monthly_bill`: 500
  - `contact`, `email`, `address` demo

### Approach

- প্রথমে DB থেকে existing branch/zone/package/tariff IDs read করব (foreign keys-এর জন্য)
- তারপর Admin SQL Editor-এর জন্য Auth user (email signup) এবং বাকিদের জন্য direct table insert
- Employee Auth user create করতে Supabase Admin API লাগবে → একটা one-time edge function বা SQL `INSERT` দিয়ে করা যাবে না (auth.users সরাসরি touch করা যাবে না)
- তাই Employee-এর জন্য আপনাকে **manually Supabase Auth Dashboard থেকে** user create করতে হবে, বাকি ৩ জনের data আমি migration/insert tool দিয়ে দেব

### Files / Actions

| Action | Purpose |
|--------|---------|
| Read query | Existing branch_id, zone_id, package_id, tariff_id collect |
| Insert tool | `branch_managers`, `bw_sale_customers`, `clients`, `employees` rows |
| Manual step | Supabase Dashboard → Authentication → "Add user" দিয়ে `employee@test.com` create + `user_roles`-এ `operator` insert |

আমি instruction দেব কীভাবে Employee Auth user dashboard থেকে create করবেন (২ ক্লিক)।

### Test Credential Card (final delivery-এ দেব)

```
Admin       : (আপনার existing)         → /dashboard
Employee    : employee@test.com / Test@1234   → /dashboard
Reseller    : reseller01 / 123456      → /reseller/dashboard
BW Reseller : bwcustomer01 / 123456    → /portal/dashboard
Client      : client01 / 123456        → /portal/dashboard
```

