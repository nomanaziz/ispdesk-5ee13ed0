# Fix invisible "Select All" checkboxes in table headers

## Problem
টেবিলের header-এ select-all checkbox দেখা যাচ্ছে না (screenshot-এ লাল গোল করে দেখানো)। কারণ — `src/components/ui/checkbox.tsx`-এ checkbox-এর শুধু `border-primary` আছে, কোনো background fill নেই। অনেক টেবিলের header background হালকা primary/lavender tint হওয়ায় primary-colored border header-এর সাথে মিশে যাচ্ছে এবং checkbox কার্যত অদৃশ্য।

## Fix (single, global change)
`src/components/ui/checkbox.tsx`-এ Checkbox root-এ দুটো class যোগ করা:

- `bg-background` → unchecked অবস্থায় solid (সাধারণত white/dark) fill, যাতে যেকোনো header background-এ checkbox-এর square স্পষ্ট দেখা যায়
- `border-2` (border-primary রেখে) → border আরেকটু মোটা ও visible

এতে app-এর প্রত্যেকটা table-এর header checkbox + row checkbox একসাথে visible হয়ে যাবে — আলাদা করে প্রত্যেক table page edit করতে হবে না।

Checked state আগের মতই থাকবে (`data-[state=checked]:bg-primary` + tick mark)।

## Files
- `src/components/ui/checkbox.tsx` — className update only

## Out of scope
- Individual table component changes (global fix যথেষ্ট)
- Checkbox size/shape/behavior পরিবর্তন
