## সমস্যা

বর্তমান `Payslip.tsx`-এ employee list flex/wrap card style — প্রতিটা কর্মীর জন্য অনেক wide row, icon-only action button, সব scattered। ছোট screen-এ ভেঙে যায়।

## সমাধান — Table আকারে সংগঠিত

`src/pages/dashboard/hr/Payslip.tsx`-এর employee list section (line 394-493) সম্পূর্ণ replace করে `<Table>` ব্যবহার করব।

### Table columns (8টা)

| # | Column | Content |
|---|--------|---------|
| 1 | checkbox | select |
| 2 | কর্মী | নাম + ID (ছোট font) |
| 3 | টেমপ্লেট | template name (truncate) |
| 4 | পেহেডস টোটাল | net + diff badge |
| 5 | পরিশোধিত / বকেয়া | দুই লাইনে |
| 6 | স্ট্যাটাস | Badge (পরিশোধিত / আংশিক / অপরিশোধিত) |
| 7 | অ্যাকশন | dropdown menu |

### Action button — Bangla dropdown

প্রতি row-তে এক "অ্যাকশন ▾" button (DropdownMenu) — ভেতরে:
- ✏️ পে-হেডস এডিট
- 👁️ পে-স্লিপ দেখুন
- 💰 পেমেন্ট নিন (only if not fully paid)
- 🖨️ PDF ডাউনলোড
- 🔄 শুধু এই কর্মীর Regenerate

এতে row narrow থাকবে, icon scatter হবে না।

### Responsive

- Card-এর ভিতরে `overflow-x-auto` দিয়ে wrap
- ছোট screen-এ horizontal scroll, কিন্তু row height fixed thin (~48px)
- Mobile-এ "টেমপ্লেট" column hide (`hidden md:table-cell`)
- "পরিশোধিত/বকেয়া" column-এ `hidden sm:table-cell`

### Header bar simplification

বর্তমান toolbar-এ ৪টা বড় button (Generate / View / Download PDF / Regenerate) আছে — এগুলো রাখব কিন্তু selected.size > 0 হলেই display, না হলে শুধু Generate। এতে header পরিষ্কার হবে।

### Status calculation একই

`net_salary`, `paid_amount`, `payment_status` field থেকে আগের মতই — কোনো business logic পরিবর্তন নেই, শুধু presentation।

### যা পরিবর্তন হবে না

- Generate / Regenerate / Pay / Edit dialog logic অপরিবর্তিত
- Filter chips (সব / নিয়মিত / অতিরিক্ত / কম) অপরিবর্তিত
- Loan cap fix (আগের message-এ করা) অপরিবর্তিত

## ফাইল

- `src/pages/dashboard/hr/Payslip.tsx` — শুধু list render block + toolbar minor tweak

অন্য কোনো ফাইল ছোঁয়া হবে না।