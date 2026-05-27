# EMP001 দিয়ে App User লগইন — ব্রিজ Setup

## সমস্যা
Login page-এ `@` না থাকলে portal login (BW/reseller/client) চেষ্টা করে — `app_users` টেবিলে EMP001 আছে কিন্তু সেটা auth flow-এ যুক্ত না। তাই EMP001/EMP001 দিয়ে কোনোভাবেই ঢোকা যাচ্ছে না।

## সমাধান (সহজ পদ্ধতি)

Employee/External app_users-কে Supabase auth-এর সাথে bridge করা হবে synthetic email দিয়ে। Login page-এ username লিখলে সেটা automatic সঠিক জায়গায় route হবে।

### 1. Edge Function — `app-user-login`
- Public (no JWT verify), input: `{ username, password }`
- করণীয়:
  1. `app_users` থেকে username + password match খোঁজে (status='active', `access_expires_at` valid)
  2. `auth_user_id` থাকলে সেটার email return করে
  3. না থাকলে synthetic email `<username>@appuser.local` দিয়ে Supabase admin API দিয়ে auth user বানায়, app_users-এ `auth_user_id` + `email` save করে
  4. Return: `{ email, ok: true }` — client সেই email + একই password দিয়ে `signInWithPassword` করবে
- যদি expired/inactive → meaningful error message

### 2. Login Page (`src/pages/Login.tsx`)
- Identifier-এ `@` নেই হলে নতুন order:
  1. প্রথমে `app-user-login` edge function call (এটা employees/external জন্য)
  2. সফল হলে synthetic email + password দিয়ে `signIn()` → `/dashboard`
  3. ব্যর্থ হলে fallback portal login (BW/reseller/client) — যেমন এখন আছে

### 3. Backfill
- বিদ্যমান EMP001 row-এ `auth_user_id` NULL — প্রথম login attempt-ই trigger করবে auth account বানানো (lazy provisioning)। আলাদা migration লাগবে না।

### 4. AuthContext — Expiry Guard
- Session load হলে `app_users` থেকে current user-এর `access_expires_at` check, expired হলে force `signOut()` + toast।

## টেকনিক্যাল

- **Secret needed**: edge function `SUPABASE_SERVICE_ROLE_KEY` (auto-available in Deno env)
- **Files**:
  - `supabase/functions/app-user-login/index.ts` (নতুন)
  - `supabase/config.toml` — function register `verify_jwt = false`
  - `src/pages/Login.tsx` — handleSubmit-এ extra try branch
  - `src/contexts/AuthContext.tsx` — expiry guard
- **Security note**: app_users-এ password এখন plaintext। সহজ রাখার জন্য এভাবেই থাকছে; ভবিষ্যতে hash (bcrypt) করা যাবে।

## ফলাফল

EMP001 দিয়ে username=EMP001, password=EMP001 লিখলেই auto দাশবোর্ডে ঢুকবে। External / Remote support user-ও একইভাবে তাদের username দিয়ে ঢুকবে। Expired user blocked থাকবে।

## প্রশ্ন
1. Synthetic email format `EMP001@appuser.local` ঠিক আছে, না-কি অন্য domain (যেমন `@ispdesk.internal`) চান?
2. App_users-এর password এখন plaintext — এটা hash করতে চান এখনই, না-কি পরে?