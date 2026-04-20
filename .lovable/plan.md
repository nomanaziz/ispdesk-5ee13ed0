

## লক্ষ্য — প্রতিটা POP reseller-এর জন্য default Zone/Sub-zone/Box hierarchy seed করা

আপনার দেওয়া hierarchy:
```text
Zone (4):  olt-1 pon-1, olt-1 pon-2, olt-1 pon-3, olt-1 pon-4
  └─ Sub-zone (1 per zone): "Main Splitter 1:8"
       └─ Box (8 per sub-zone): "sub-Splitter 1:8 1" ... "sub-Splitter 1:8 8"
```
প্রতিটা POP-এর জন্য মোট: **4 zones + 4 sub-zones + 32 boxes = 40 rows**।

বর্তমান POP reseller (২টা): **noman** (branch `041f...`) এবং **Demo POP Reseller** (branch `2697...`)।

## কাজ

### ১. Insert migration — দুই POP-এর জন্য seed
প্রতিটা POP-এর `branch_id` scope-এ:
- **4 zones** insert (`name`, `branch_id`, `status='active'`, `code='PON1'..'PON4'`)
- প্রতিটা zone-এর জন্য **1 sub-zone** insert (`name='Main Splitter 1:8'`, `zone_id`, `branch_id`)
- প্রতিটা sub-zone-এর জন্য **8 boxes** insert (`name='sub-Splitter 1:8 N'`, code unique per POP যেমন `<pop_code>-PON1-B1`, `branch_id`)

**Idempotency**: একই POP-এ একই zone name আগে থেকে থাকলে skip — `WHERE NOT EXISTS` clause দিয়ে নিরাপদ rerun।

### ২. Future POPs-এর জন্য auto-seed trigger
নতুন POP তৈরি হলে (যখন `branch_managers.branch_id` set হয়) trigger automatic এই 40 rows insert করবে। ফলে প্রত্যেক নতুন reseller default hierarchy পেয়ে যাবে।

**Trigger function**: `seed_default_pop_hierarchy()` — `AFTER INSERT OR UPDATE OF branch_id ON branch_managers`, যখন `NEW.branch_id IS NOT NULL` এবং সেই branch-এ এখনো কোনো zone নেই তখনই run।

POP চাইলে পরে edit/delete করতে পারবে (read-only নয়)।

## Files & changes

**Migration (1 file):**
- 4 zones × 2 POPs = 8 zone rows
- 4 sub-zones × 2 POPs = 8 sub-zone rows  
- 32 boxes × 2 POPs = 64 box rows
- 1 trigger function + trigger on `branch_managers`

**No frontend changes** — existing `PopZones.tsx`, `PopSubZones.tsx`, `PopBoxes.tsx` pages এই data এমনিতেই দেখাবে কারণ সব already `branch_id`-scoped।

## যা **হবে না**
- বিদ্যমান custom zone/sub-zone/box data delete হবে না
- Admin-level (branch_id NULL) zones-এ কোনো effect নেই
- Code/naming conflict হলে skip — কোনো POP-এর existing data নষ্ট হবে না

approve করলে migration push করি।

