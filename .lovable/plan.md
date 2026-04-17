
## লক্ষ্য

সব active client-এর জন্য current month-এর invoice তৈরি করতে হবে — যাদের এখনো নেই।

## প্রশ্ন: data কেমন আছে?

দরকার আগে DB inspect করা — `clients` table-এ কী কী `client_type` / `connection_type` আছে, এবং `billing` table-এ এই মাসের কী আছে।

## পরিকল্পনা

### Step 1: Data verify (read-only)
`clients` table থেকে check:
- `client_type` distinct values (Free, Personal, Regular ইত্যাদি কী আছে)
- `monthly_bill` values
- `billing` table-এ current month (`2026-04-01`) কতগুলো invoice আছে

### Step 2: Edge function update
`supabase/functions/generate-monthly-billing/index.ts` already আছে। সেটাকে enhance করব:

**নিয়ম:**
- **Personal** type → skip (invoice তৈরি হবে না)
- **Free** type → invoice তৈরি হবে `amount: 500, paid_amount: 500, due: 0, status: "paid"` (free invoice হিসেবে markered, but শূন্য বকেয়া)
- **বাকি সব active client** → normal invoice (`amount: monthly_bill, due: monthly_bill, status: "unpaid"`)
- যাদের ইতিমধ্যে এই মাসের invoice আছে → skip
- `billing_status = "Left"` → skip

### Step 3: Manual trigger
Function call করে current month-এর সব missing invoice generate করব। এক ক্লিকেই backfill হয়ে যাবে।

### Step 4: Verify
Generation-এর পর `billing` table-এ count check করে নিশ্চিত করব।

## Files

**Edit:**
- `supabase/functions/generate-monthly-billing/index.ts` — Personal skip + Free zero-due logic

**Run:**
- Function invoke (current month backfill)

কোনো DB schema change নেই; শুধু data insert হবে existing `billing` table-এ।

## ফলাফল

- সব non-personal active client-এর এই মাসের invoice তৈরি হয়ে যাবে
- Free client-দের invoice দেখাবে ৫০০৳ paid (শূন্য due)
- Personal client কোনো invoice পাবে না
- Client portal-এ ("আমার বিল" tab-এ) সবাই তাদের invoice দেখতে পারবে
