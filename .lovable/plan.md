# Move Events & Holidays into HR + Holiday Auto-Import + Leave Tuning

## লক্ষ্য

১। "ইভেন্ট ও ছুটি" মেনুটাকে আলাদা group থেকে সরিয়ে **HR ও পেরোল** group এর ভেতরে নিয়ে আসা — route, permission module সব একসাথে move হবে যাতে permission table এ আর আলাদা `LEAVE > Setup` entry না থাকে।
২। বাংলাদেশের **government holiday** প্রতি বছর automatic add হওয়ার ব্যবস্থা।
৩। **ছুটি (leave) allocation** আরো গুছিয়ে — কে কোন category তে বছরে কয়টা ছুটি পাবে সেটা configure করা।

---

## ১. মেনু ও Permission একীভূতকরণ

- `src/components/AppSidebar.tsx`: "ইভেন্ট ও ছুটি" আলাদা group টা মুছে, item টা **HR ও পেরোল** group এর ভেতরে নতুন route `"/dashboard/hr/events-holidays"` দিয়ে যোগ করব (ছুটি ম্যানেজমেন্ট এর পাশে)।
- `src/App.tsx`: পুরাতন `/dashboard/events` route কে নতুন `/dashboard/hr/events-holidays` এ redirect এবং নতুন route এ `Events` component mount।
- `src/lib/menuItemModuleMap.ts`: `/dashboard/events` mapping সরিয়ে নতুন route কে **`HR > Events & Holidays`** module এ point করব।
- Migration: 
  - `app_role_modules` এ পুরাতন `LEAVE > Setup` rows এর enabled/permission মান copy করে নতুন `HR > Events & Holidays` rows তৈরি করব (সব role এর জন্য, যাতে কেউ access হারায় না)।
  - পুরাতন `LEAVE > Setup` rows delete।
  - Super Admin/Admin কে নতুন module এ full access।

## ২. বাংলাদেশ Government Holiday auto-import

- নতুন table **`bd_government_holidays`** (year, date, title_bn, title_en, category — public/optional/religious, source)। RLS: সবাই read, admin write। GRANT যথাযথ।
- Edge function **`import-bd-holidays`**: parameter `{year}` নিয়ে public source থেকে fetch করে upsert করবে। প্রথম source হিসেবে [date.nager.at](https://date.nager.at/api/v3/PublicHolidays/{year}/BD) ব্যবহার করব (free, no key); failure হলে static seed list fallback (২০২৫–২০২৭ এর জন্য hand-curated BD holidays bundle)। Religious holiday (ঈদ, পূজা) এর সঠিক তারিখ admin manual override করতে পারবে।
- Cron/Trigger: প্রতি বছর January 1 এ scheduled trigger (pg_cron) যা automatic ভাবে নতুন বছরের holiday import করবে। প্রথম বার চালু হলে current ও next year import হবে।
- Events page এ নতুন **"সরকারি ছুটি Import"** button: year select + "Import / Re-sync" → edge function call → success হলে holiday গুলো `events_holidays` table এ `type='holiday'`, `source='bd_govt'` দিয়ে upsert। Manual created event/holiday গুলো অপরিবর্তিত থাকবে।
- `events_holidays` table এ দুটো column যোগ: `source text` (manual/bd_govt), `external_id text` (idempotent re-sync এর জন্য, unique with year)।

## ৩. Leave allocation fine-tuning

বর্তমানে `/dashboard/leave/categories` ও `LeaveManagement` আছে। নতুন যোগ করব:

- `leave_categories` table এ field যোগ (যদি না থাকে): `annual_quota int` (বছরে কত দিন), `gender` (any/male/female), `min_service_months int` (কত মাস চাকরি হলে পাবে), `carry_forward boolean`, `max_carry_days int`, `is_paid boolean`।
- নতুন table **`employee_leave_balances`** (employee_id, category_id, year, allocated, used, carried_from_prev) — প্রতি employee × category × year।
- নতুন function `recalculate_leave_balances(year)`: সকল active employee এর জন্য category অনুযায়ী allocation generate করবে, eligibility (gender, service length) check করে।
- `LeaveManagement` page এ নতুন tab **"বার্ষিক বরাদ্দ"** — year selector + employee/category grid দেখাবে allocated/used/remaining। "নতুন বছর বরাদ্দ তৈরি" button যা উপরের function call করবে।
- Leave apply করার সময় current year balance check করে remaining < requested হলে block করবে।

বাংলাদেশের default leave categories seed হিসেবে যোগ করব (admin পরে customize করতে পারবে):

| Category | Quota (দিন/বছর) | Notes |
|---|---|---|
| Casual Leave (নৈমিত্তিক) | ১০ | paid |
| Sick Leave (অসুস্থতাজনিত) | ১৪ | paid, doctor cert |
| Earned/Annual Leave | ২০ | carry-forward, max ৪০ |
| Maternity Leave | ১১২ দিন | female only, paid |
| Paternity Leave | ৭ | male only |
| Without Pay | unlimited | unpaid |

## Technical Section

**Files to modify:**
- `src/components/AppSidebar.tsx` — remove standalone group, add item under HR
- `src/App.tsx` — new route `/dashboard/hr/events-holidays`, redirect old
- `src/lib/menuItemModuleMap.ts` — remap to `HR > Events & Holidays`
- `src/pages/dashboard/events/Events.tsx` — add "Import BD Holidays" button, year selector
- `src/pages/dashboard/hr/LeaveManagement.tsx` — add "বার্ষিক বরাদ্দ" tab

**New files:**
- `supabase/functions/import-bd-holidays/index.ts`
- Migration files for: column additions, new tables (`bd_government_holidays`, `employee_leave_balances`), permission module rename, cron schedule, seed leave categories.

**Edge function source priority:**
1. `https://date.nager.at/api/v3/PublicHolidays/{year}/BD`
2. Bundled static fallback JSON

---

কোনো acceptable হলে এগিয়ে যাই। আপনার confirm এর পর migration আগে চলবে, তারপর code change।
