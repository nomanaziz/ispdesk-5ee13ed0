## পরিবর্তন

`src/pages/dashboard/hr/Payslip.tsx`-এর table-এ দুটো জিনিস ঠিক করব:

### ১. Column width কমানো (ফাঁকা জায়গা কাটা)

- পেহেডস টোটাল, পরিশোধিত/বকেয়া, স্ট্যাটাস — তিনটার `whitespace-nowrap` থাকা সত্ত্বেও table cell flex-grow করে অনেক জায়গা নিচ্ছে
- "কর্মী" column-কে `w-full` দিয়ে remaining জায়গা দখল করাব, বাকি column-গুলো `w-[1%] whitespace-nowrap` দিয়ে content-fit করব
- ফলে নাম column প্রসারিত হবে, বাকিগুলো compact হবে

### ২. Action button visible (dropdown বাদ)

DropdownMenu সরিয়ে একটা horizontal icon strip:

| Icon | Label (tooltip) | Color |
|------|-----------------|-------|
| ✏️ Edit2 | পে-হেডস এডিট | amber |
| 👁️ Eye | পে-স্লিপ দেখুন | blue |
| 💰 Receipt | পেমেন্ট নিন | green (only if unpaid/partial) |
| ⬇️ Download | PDF ডাউনলোড | default |
| 🔄 RefreshCw | পুনঃজেনারেট/জেনারেট | orange |

প্রতিটা icon button-এ shadcn `Tooltip` wrap, hover/click করলে Bangla label দেখাবে। Button size `h-7 w-7`, gap-1 — compact strip।

`TooltipProvider` page level-এ wrap করব (যদি না থাকে)।

### যা একই থাকবে

- Mobile-এ "টেমপ্লেট" ও "পরিশোধিত/বকেয়া" column hide
- সব business logic (generate, edit dialog, payment)

ফাইল: শুধু `src/pages/dashboard/hr/Payslip.tsx`