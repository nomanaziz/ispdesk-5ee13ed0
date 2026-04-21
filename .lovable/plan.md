

## সমস্যা (root cause)
Database trigger `log_tariff_package_change` (table: `reseller_tariff_packages`) `NEW.effective_from` ও `NEW.effective_to` reference করছে, কিন্তু table-এ এই দুটো column নাই। ফলে যেকোনো INSERT/UPDATE করলেই error: **"record 'new' has no field 'effective_from'"**।

Admin Tariff Edit save করলে trigger fail → packages save হয় না → POP > Package page-এ tariff-এর কোনো package দেখায় না।

## সমাধান (১টি migration)

`reseller_tariff_packages` table-এ ২টি missing column যোগ করা:

```sql
ALTER TABLE public.reseller_tariff_packages
  ADD COLUMN IF NOT EXISTS effective_from timestamptz,
  ADD COLUMN IF NOT EXISTS effective_to   timestamptz;
```

এতে trigger-এর existing logic অপরিবর্তিত কাজ করবে — `effective_from/to` change হলে log হবে, না হলে skip হবে। কোনো trigger বা function rewrite লাগবে না।

## যাচাই (apply-এর পরে)
1. Admin → Edit Tariff → save → কোনো error আসা উচিত না।
2. POP → Package page → updated tariff-এর সব package list দেখাবে।
3. Existing data intact (শুধু ২টি nullable column যুক্ত হবে)।

## যা **বদলাবে না**
- কোনো frontend code change নাই
- Edge function (`portal-data`) intact
- Trigger logic intact
- Existing rows intact

## Files
- **Migration only**: `ALTER TABLE` add 2 columns

approve করলে migration run করব।

