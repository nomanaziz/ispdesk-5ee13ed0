## লক্ষ্য

নতুন client এর প্রথম মাসের prorated bill এ যেই বড় fraction (যেমন 370.97) আসছে সেটা বন্ধ করা। নিয়ম:
- দশমিকের পরের অংশ ≥ 0.50 হলে → পরের পূর্ণ সংখ্যা (370.97 → 371)
- < 0.50 হলে → আগের পূর্ণ সংখ্যা (370.05 → 370)

মানে standard `Math.round()`. Bill amount integer হিসাবে store ও display হবে, কোন fractional taka থাকবে না।

## কোথায় পরিবর্তন

দুটি জায়গায় prorated bill তৈরি হয়:

1. **`supabase/functions/portal-data/index.ts` (line ~1060)** — POP portal থেকে নতুন client তৈরি করার সময় ১ম মাসের bill।
   - বর্তমান: `Math.round((monthly / totalDays) * daysRemaining * 100) / 100` (2 decimal)
   - নতুন: `Math.round((monthly / totalDays) * daysRemaining)` (integer)
   - `amount` এবং `due` দুটাই integer হিসেবে insert হবে।

2. **`src/lib/bandwidthBilling.ts` (line ~164, `proratedFirstMonthBill`)** — admin side helper।
   - বর্তমান: `Math.round(((monthlyPrice / total) * daysRemaining) * 100) / 100`
   - নতুন: `Math.round((monthlyPrice / total) * daysRemaining)`

## প্রভাব

- নতুন তৈরি হওয়া bill এ আর fraction আসবে না।
- `BillReceiveDialog` এ যে 370.97 / 0.97000... দেখাচ্ছিল সেটা integer হয়ে যাবে (যেমন 371) — আলাদা UI fix লাগবে না কারণ value-ই integer হবে।
- পুরনো ভাবে যেসব bill ইতিমধ্যে fraction এ store হয়ে আছে (shipon এর 370.97), সেগুলো এই code change এ change হবে না। দরকার হলে user কে জিজ্ঞেস করব ওগুলোকেও round করে দিতে এক-শট migration দিয়ে।

## যা পরিবর্তন হবে না

- Bandwidth reseller side এর per-MB cost calculation (`perDayCost`, `costForMbps`) — সেগুলো internal calc, final invoice আলাদা পথে round হয়।
- VAT, discount বা payment receive logic — অপরিবর্তিত।
- Monthly recurring bill (যেটা package price থেকে সরাসরি আসে) — already integer।
