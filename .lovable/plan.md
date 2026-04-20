

## সমস্যা
Tariff save/update-এ error: `record "new" has no field "profile_speed"`

DB trigger function `log_tariff_package_change()` এমন column reference করছে যা `reseller_tariff_packages` table-এ নেই:
- `NEW.profile_speed` ❌ (নেই)
- `NEW.package_rate` ❌ (আসল নাম: `buy_rate`, `selling_rate`)

আগের migration-এ শুধু `tariff_type` rename ঠিক হয়েছিল, কিন্তু এই দুটি ভুল reference রয়ে গেছে।

## সমাধান
নতুন migration দিয়ে `log_tariff_package_change()` trigger function fix:

1. **`profile_speed` references সরানো** — ওই column নেই, change tracking থেকে বাদ, INSERT statement থেকেও বাদ (অথবা NULL pass)।
2. **`package_rate` → `selling_rate`** ব্যবহার (log table-এ যা `package_rate` নামে store হয় সেটা actual selling rate)।
3. **Change log INSERT** adjust — `profile_speed` column যদি log table-এ থাকে, NULL pass করব (backward compatible)।

## পরিবর্তন
- নতুন migration: `log_tariff_package_change()` function পুরোপুরি rewrite করে শুধু existing column ব্যবহার করবে।
- কোনো frontend file বদলাবে না।
- কোনো data বদলাবে না, শুধু trigger function।

## যা বদলাবে না
- `reseller_tariff_packages` table schema
- `reseller_tariff_change_logs` table schema
- Frontend Tariff form
- Date-to-Date logic

approve করলে migration apply করি।

