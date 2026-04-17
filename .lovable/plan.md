
## লক্ষ্য

**NAIM** নামে একটা demo client তৈরি করব যার সব তথ্য পূর্ণ থাকবে — যাতে portal-এর প্রতিটি page-এ data দেখা যায়। সাথে সব portal-wide content (notice, news, media servers ইত্যাদি) seed করব।

## সমস্যাগুলো (চিহ্নিত)

Portal pages (Dashboard, Live Usage) ঠিকই data field show করছে কিন্তু DB-তে content নেই:
- **clients table**: NAIM user নেই → তাই service overview-তে speed/connection/protocol/zone/NID খালি
- `client_notices`: 0 rows → notice show হবে না
- `client_news_events`: 0 rows
- `media_servers`: 0 rows
- `support_tickets`: 0 rows
- `billing` (NAIM): row নেই → মাসিক বিল/invoice খালি
- `system_settings`: company info খালি
- `shop_orders`: NAIM-এর জন্য কিছু নেই (এটা চাইলে রাখব, না-হয় skip)

## পরিকল্পনা — Demo data seed

### 1. NAIM client তৈরি (insert into `clients`)
সকল field পূর্ণ:
- `client_id: NAIM001`, `name: Naim N.A.M`, `username: naim`, `password: naim123`
- `contact: 01711-000001`, `email: naim@example.com`
- `address: ঢাকা, মিরপুর-১০`, `permanent_address`, `road_number`, `house_number`
- `nid_number: 1234567890123`, `father_name`, `mother_name`, `gender`, `date_of_birth`, `occupation`
- `package_id`: পপুলার package, `monthly_bill: 800`
- `connection_type: PPPoE`, `protocol_type: PPPoE`, `speed: 20 Mbps`, `profile: 20M`
- `zone_id`: কেন্দ্রীয় জোন
- `status: Active`, `billing_status: Active`, `mikrotik_status: enabled`
- `is_online: true`, `total_download: 45 GB`, `total_upload: 12 GB`
- `joining_date: 2024-01-15`, `billing_date: 5`
- `is_vip: true`, `remote_address: 10.10.10.50`, `mac_address`

### 2. Current month-এর billing row তৈরি (insert into `billing`)
- 2026-04 মাস, `amount: 800`, `paid: 0`, `due: 800`, `status: unpaid`, `bill_id: BILL-NAIM-202604`
- সাথে previous month-এর একটা **paid** invoice (March) যাতে history থাকে

### 3. Portal-wide content seed
- **client_notices**: ২টা active notice (১টা pinned: "ঈদ অফার", আরেকটা: "Service maintenance")
- **client_news_events**: ২টা news (একটা event, একটা news)
- **media_servers**: ৪টা active server (FTP, Live TV, Movie server, YouTube proxy)
- **support_tickets**: NAIM-এর ১টা open ticket (subject: "ইন্টারনেট স্লো হচ্ছে")
- **system_settings**: company info — `company_name`, `company_address`, `hotline`, `email`, `website`, `tagline`, `payment_instructions`

### 4. Portal login info
NAIM portal-এ login করতে: **username: `naim`** / **password: `naim123`** (অথবা client_id `NAIM001`)

## ফলাফল

Portal-এ NAIM হিসেবে login করলে:
- ✅ Dashboard: package "পপুলার", speed "20 Mbps", connection PPPoE, NID, zone, mobile, email — সব show হবে
- ✅ Live Usage: ক্লায়েন্ট তথ্য header-এ পূর্ণ; (live traffic real MikroTik-এ depend, demo user-এর জন্য offline graph হবে)
- ✅ Notices: ২টা notice দেখা যাবে
- ✅ News & Events: ২টা item
- ✅ Company Info: ISP-র সব তথ্য
- ✅ Movie/FTP Servers: ৪টা server list
- ✅ মাসিক বিল: এপ্রিল ২০২৬-এর ৳৮০০ unpaid + মার্চের paid history
- ✅ Invoices: একই
- ✅ My Orders: empty থাকবে (shop থেকে order করলে আসবে — আলাদা step)
- ✅ Support: ১টা existing ticket দেখা যাবে; নতুন create করলেও আসবে

## Files

কোনো code change লাগবে না — শুধু **DB inserts** (data seed)। সব pages আগে থেকেই DB থেকে data টানছে; data থাকলেই দেখাবে।
