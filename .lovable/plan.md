
## বিলিং অটো-ডিসেবল + Dashboard card simplification — fix plan

### এখন পর্যন্ত যা পরিষ্কার

#### ১) লাইন বন্ধ না হওয়ার মূল কারণ
Code + database check করে দেখা গেছে:

- `billing_enforcement` setting **enabled = true**
- cutoff time **00:00**
- কিন্তু `pg_cron`-এ **`enforce-billing` function-এর কোনো scheduled job নাই**
- `enforce-billing` edge function-এর **recent log-ও নেই**
- তাই গতরাতে function **চলাই নাই**, এই কারণেই MikroTik-এ disable হয়নি

#### ২) data অনুযায়ী বর্তমান অবস্থা
বর্তমান database-এ:

- **12 জন** active client আছে যাদের billing date already reach করেছে
- এদের মধ্যে **3 জন** নিশ্চিতভাবে unpaid/partial due অবস্থায় আছে, যাদের line disable candidate
- **5 জনের** `expire_date` already পার হয়ে গেছে
- কিন্তু **প্রায় সব client-এর `mikrotik_status = enabled`**
- `clients.status` field-এ casing mismatch আছে: `active` এবং `Active` দুইটাই আছে
- `billing_status`-এ `Active`, `Inactive`, `Left`, `Personal` আছে
- `status = suspended / expired / grace / extended` প্রায় ব্যবহারই হচ্ছে না

এজন্য dashboard-এর কিছু card technically possible হলেও raw data এখন fragmented।

---

## কোন card করা যাবে, কোনটা merge করা ভালো

### সরাসরি করা যাবে
1. **Billing Date Expired / Overdue**
   - করা যাবে
   - source: `billing_date`, current month billing row, `due > 0`, client active

2. **Blocked / Disabled Client**
   - করা যাবে
   - source: `mikrotik_status = disabled` এবং/অথবা `clients.status = suspended`

3. **Inactive / Left Client**
   - করা যাবে
   - source: `billing_status in ('Inactive','Left')` + `clients.status in ('inactive','left')`

4. **Expired Client**
   - করা যাবে
   - source: `expire_date < today`

### exactভাবে এখন করা যাবে না
5. **Unpaid Extension যাদের দেওয়া হয় নাই**
   - exactভাবে এখন reliable করা যাবে না
   - কারণ dedicated `extension request / approval / granted_until / extension_status` model নাই
   - বর্তমানে শুধু `extended` / `grace` status আছে, কিন্তু data use হচ্ছে না

### merge করার recommendation
অনেক ছোট ছোট card না রেখে ৪টা useful card-এ নামিয়ে আনা ভালো:

#### Recommended merged cards
1. **বিলিং ওভারডিউ**
   - billing date পার হয়েছে + unpaid/partial due আছে

2. **বন্ধ লাইন**
   - MikroTik disabled + suspended clients

3. **মেয়াদোত্তীর্ণ**
   - `expire_date` পার হয়ে গেছে

4. **নিষ্ক্রিয় / বাতিল**
   - inactive + left merge

#### Optional 5th card
5. **এক্সটেনশন / গ্রেস**
   - `status in ('extended','grace')`
   - exact unpaid extension না, but closest useful fallback

এভাবে dashboard cleaner হবে, আর duplicate/confusing card কমবে।

---

## কী implement করা হবে

### Step 1: `enforce-billing` automation সত্যি চালু করা
Supabase migration দিয়ে নতুন scheduled job add করা হবে:

- `enforce-billing` কে cron-এ schedule করা
- recommended: প্রতি **60 মিনিটে** run
- পরে চাইলে `recheck_interval` setting-এর সাথে align করা যাবে

এতে রাত ১২টার পর function automatically চলবে।

---

### Step 2: `enforce-billing` logic harden করা
`supabase/functions/enforce-billing/index.ts` update করা হবে যাতে:

- `status` check case-insensitive হয় (`active` + `Active`)
- `billing_enforcement.grace_days` আসলেই apply হয়
- `recheck_interval` setting future-compatible রাখা হয়
- current month billing row না থাকলে client auto disable না করে safer logic use করা হয়
- MikroTik API fail হলে client row-তে blind `mikrotik_status: disabled` set না করে proper result log রাখা হয়
- result payload-এ counts clearly আসে:
  - checked
  - overdue
  - disabled
  - skipped_paid
  - skipped_no_bill
  - failed

---

### Step 3: audit/logging add করা
নতুন table বা existing log table pattern follow করে enforcement run log রাখা হবে:

- run time
- checked client count
- disabled count
- skipped count
- per-client error message

এতে পরে আপনি দেখতে পারবেন:
- কখন job run হয়েছে
- কাদের disable করেছে
- কাদের করেনি
- MikroTik auth / device / username issue আছে কিনা

---

### Step 4: Dashboard cards simplify করা
`src/pages/Dashboard.tsx`-এ card set refactor করা হবে।

#### remove / merge
এই fragmented cardগুলো merge করা হবে:
- Block client
- Disabled client
- Billing date expired
- Left client
- Inactive client
- Unpaid extension (exact data না থাকলে separate card হবে না)

#### new simplified cards
নতুন concise cards:

- **ওভারডিউ বিলিং**  
  billing date পার + due outstanding

- **বন্ধ লাইন**  
  MikroTik disabled + suspended

- **মেয়াদোত্তীর্ণ**  
  `expire_date < today`

- **নিষ্ক্রিয়/বাতিল**  
  inactive + left

- **গ্রেস/এক্সটেনশন**  
  optional, only if data meaningful

---

### Step 5: card calculation rules normalize করা
Dashboard query-তে mixed field rules unify করা হবে:

- `clients.status` → operational/system state
- `billing_status` → commercial category/state
- `mikrotik_status` → router sync state

এগুলোর উপর clear derived metrics বানানো হবে, যেমন:

```text
Overdue Billing
= active client
+ billing date passed
+ current month due > 0
+ not VIP

Blocked Line
= mikrotik_status = disabled
OR status = suspended

Expired
= active client
+ expire_date < today

Inactive/Left
= billing_status in (Inactive, Left)
OR status in (inactive, left)
```

---

## Files likely to change

| File | Work |
|------|------|
| `supabase/functions/enforce-billing/index.ts` | disable logic fix + safer rules + detailed result |
| Supabase migration | cron schedule for `enforce-billing` |
| optional migration/table | enforcement audit log |
| `src/pages/Dashboard.tsx` | cards merge, count rules cleanup |
| `src/pages/dashboard/system/Setup.tsx` | wording cleanup so enforcement settings বাস্তব behavior-এর সাথে match করে |
| optional `src/pages/dashboard/system/ClientBillingSettings.tsx` | extension/grace wording align |

---

## Expected result

### backend side
- billing cutoff পার হলে job সত্যি run করবে
- unpaid active PPP client auto disable হবে
- disable না হলে reason track করা যাবে

### dashboard side
আপনি আলাদা আলাদা বিরক্তিকর card না দেখে compact useful view পাবেন:

```text
ওভারডিউ বিলিং | বন্ধ লাইন | মেয়াদোত্তীর্ণ | নিষ্ক্রিয়/বাতিল | (optional) গ্রেস/এক্সটেনশন
```

### data truth
- “কতজন expired”
- “কতজন line বন্ধ”
- “কতজন due হয়ে গেছে”
- “কতজন inactive/left”

এক নজরে দেখা যাবে।

---

## Important implementation note
বর্তমান data model-এ **“Unpaid Extension যাদের দেওয়া হয়নি”** exactভাবে trustworthy card হিসেবে দেখাতে চাইলে পরে আলাদা extension tracking লাগবে, যেমন:

- `extension_requested_at`
- `extension_granted_until`
- `extension_status`
- `approved_by`

এটা এই phase-এ optional; এখন merge-based dashboard দিয়েই পরিষ্কার view দেওয়া যাবে।
