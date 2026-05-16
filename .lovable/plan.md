
# BW Panel Sidebar — Simplification Plan

BW reseller (POP admin) এর সাইডবার থেকে অপ্রয়োজনীয় menu item বাদ দেওয়া হবে। সব পরিবর্তন শুধু `src/components/BwCustomerLayout.tsx` এর `panelGroups` array তে — কোনো backend / route / page ফাইল পরিবর্তন হবে না (পেজগুলো থাকবে, শুধু sidebar থেকে link সরে যাবে)।

---

## 1) ক্লায়েন্ট গ্রুপ — কেটে দেওয়া হবে

**বাদ যাবে (image-281 এ cross করা):**
- নতুন রিকোয়েস্ট
- হোম ক্লায়েন্ট
- কর্পোরেট ক্লায়েন্ট
- ইনস্টলেশন ফি
- চলে যাওয়া ক্লায়েন্ট
- শিডিউলার
- পরিবর্তন রিকোয়েস্ট
- ক্লায়েন্ট যোগ (Add Client menu — list থেকে "Add" button দিয়েই add হবে)

**থাকবে (final list, এই order এ):**
- ক্লায়েন্ট তালিকা — সব ক্লায়েন্ট (Home + Corporate একসাথে), filter দিয়ে আলাদা দেখা যাবে
- বাল্ক ইম্পোর্ট
- বিলিং তালিকা
- দৈনিক বিল কালেকশন
- মাইক্রোটিক ইউজার (Device গ্রুপে already আছে, তাই এখানে থাকবে না)

> "ক্লায়েন্ট তালিকা" বনাম "হোম ক্লায়েন্ট" — Home page টা শুধু `client_type=Home` filter করা version। সাধারণ list এই দুটোই দেখায়, তাই আলাদা home menu লাগে না।

---

## 2) OLT ম্যানেজমেন্ট — অনেক simplify

**বাদ যাবে (image-282 এ cross করা + অতিরিক্ত):**
- OLT / ONU ওভারভিউ
- OLT Power Dashboard
- OLT ইউজার
- OLT Port Classification
- ফাইবার ডাউন ফাইন্ডার
- OLT শেয়ারিং
- OLT ডিভাইস (পরিবর্তে System / Configuration থেকে manage হবে; user বলেছে "শুধু অণু add করবে")

**থাকবে (simplified):**
- **ONU তালিকা** — প্রতি ONU এর: MAC/serial, status (online/offline), current RX power, last seen
- **ইউজার ডাউন কাউন্ট** — offline ONU সংখ্যা + কারণ (Power Off / Fiber Cut / Unknown)

> ONU add করার option থাকবে "ONU তালিকা" পেজের ভিতরেই — আলাদা menu না।

---

## 3) নেটওয়ার্ক মনিটরিং — অর্ধেক বন্ধ

**বাদ যাবে (image-283 এ cross করা):**
- Switch ম্যানেজমেন্ট
- POP DASS
- POP IP
- POP লগ
- Ping টুলস
- POP ডিভাইস

**থাকবে:**
- অনলাইন মনিটরিং (online clients + কোন user কত traffic টানছে)
- Live Traffic

---

## Technical Notes

- File: `src/components/BwCustomerLayout.tsx` → `panelGroups` array এর তিনটি গ্রুপ (`client`, `olt`, `monitoring`) এর `items[]` কাটছাঁট।
- পেজ ফাইল / route registration / Add Client form — কিছুই touch হবে না। ভবিষ্যতে দরকার হলে আবার menu তে যোগ করা যাবে।
- কোনো DB migration বা edge function পরিবর্তন নেই।
- পরীক্ষা: BW customer (panel active) দিয়ে login করে sidebar visually verify করব।
