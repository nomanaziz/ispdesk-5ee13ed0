
# Pay Head — Default ১০টি Seed

## বর্তমান অবস্থা
- পেজ ইতিমধ্যেই আছে: `src/pages/dashboard/hr/Payheads.tsx` (ConfigCrudPage ব্যবহার করে `payheads` table)
- Sidebar/Route: HR → Payheads-এ accessible
- DB table `public.payheads` খালি — কোন default row নেই

## কাজ
শুধু ডিফল্ট ১০টি pay head DB-তে insert করব (ON CONFLICT DO NOTHING দিয়ে, যেন বার বার চললেও duplicate না হয়):

| # | Name | Type |
|---|---|---|
| 1 | Basic Salary | allowance |
| 2 | Late Fee | deduction |
| 3 | Early Out | deduction |
| 4 | Overtime | allowance |
| 5 | Incentive | allowance |
| 6 | Bonus | allowance |
| 7 | Food Allowance | allowance |
| 8 | Mobile Bill | allowance |
| 9 | Salary Advance | deduction |
| 10 | Absence | deduction |

(`name` UNIQUE constraint না থাকলে `WHERE NOT EXISTS` দিয়ে handle করব।)

## পেজ লেবেল
"Configuration → পে-হেড ম্যানেজমেন্ট" নামে দেখাতে হলে sidebar/route label-ও আপডেট লাগে। বর্তমান menu-তে এটা HR-এর নিচে আছে। **আমার সাজেশন:** HR-এ যেটা আছে সেটাই রাখি, শুধু DB seed করি। নাকি Configuration menu-তেও duplicate entry যোগ করব?

কোন code change লাগবে না (পেজ already exists)। শুধু একটি SQL data-insert call।
