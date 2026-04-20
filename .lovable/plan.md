

## লক্ষ্য
`reseller01` POP Manager account-কে **postpaid** type করে set up করা যাতে `Galaxy@123` password দিয়ে portal-এ login করা যায় এবং সব permission দেখতে পায়।

## বর্তমান অবস্থা (DB-তে যা আছে)
| field | value |
|---|---|
| username | `reseller01` ✅ আছে |
| name | Demo POP Reseller |
| password | `123456` ❌ (আপনার চাওয়া `Galaxy@123`) |
| pop_type | `prepaid` ❌ (আপনার চাওয়া `postpaid`) |
| status | `Active` ✅ |
| portal_enabled | `true` ✅ |
| client_code | `NULL` ⚠ (login response-এ blank দেখাবে) |
| balance | 5000 |

**Login fail কেন:** password mismatch। নতুন account তৈরির দরকার নেই — existing row update করলেই হবে।

## পরিবর্তন (১টি data update migration)

`branch_managers` table-এ `reseller01` row update:
```sql
UPDATE branch_managers
SET password = 'Galaxy@123',
    pop_type = 'postpaid',
    client_code = '0002',
    portal_enabled = true,
    status = 'Active'
WHERE username = 'reseller01';
```

## Permission ব্যবস্থা (already in place)
`portal-auth/index.ts`-এ reseller login হলে এই permission সব দেওয়া হয়:
```ts
permissions: { dashboard, invoices, purchases, tickets, users, settings: true }
```
ResellerLayout এর full sidebar (Dashboard, MikroTik Users, Billing Invoices, Purchase Orders, Support Tickets, User Management, Company Settings) দেখাবে — কোনো code change লাগবে না।

## Login credentials (update-এর পরে)
- URL: `/login`
- Username: `reseller01`
- Password: `Galaxy@123`
- Type: POP Manager (postpaid)
- Redirect: `/reseller/dashboard`

## কী **হবে না**
- নতুন row create হবে না (already exists)
- কোনো code/UI change নেই — শুধু data update
- অন্য reseller (`noman / ABC`) অপরিবর্তিত থাকবে

## ফাইল পরিবর্তন
শুধু একটি data update query (insert tool দিয়ে) — কোনো source file edit নেই।

