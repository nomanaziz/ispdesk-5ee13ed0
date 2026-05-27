আপনার তিনটা সমস্যা analyze করলাম। নিচের প্ল্যান অনুযায়ী কাজ করব:

## ১. HR sidebar consolidation (২৩ → ১৪ items)

বর্তমানে HR ও পেরোলে ২৩টা sub-menu আছে। Settings/rule-জাতীয় পেজগুলো একত্রে "HR সেটিংস" পেজে ট্যাব আকারে আনব। এটাতে কোনো ডাটা/feature হারাবে না — শুধু একই জায়গায় থাকবে।

**HR সেটিংস পেজে নতুন tab structure:**
- কর্মচারী ID (আগের মত)
- উপস্থিতি settings (আগের মত)
- পে-স্লিপ settings (আগের মত)
- **উপস্থিতি নিয়ম** (AttendanceRules — নতুন ট্যাব)
- **রিজাইন নিয়ম** (ResignRules — নতুন ট্যাব)
- **সুবিধা পলিসি** (FacilityPolicies — নতুন ট্যাব)
- **ডিপার্টমেন্ট** (Departments — নতুন ট্যাব)
- **পদবী** (Positions — নতুন ট্যাব)
- **পে-হেড** (Payheads — নতুন ট্যাব)
- **শিফট ম্যানেজমেন্ট** (ShiftManagement — নতুন ট্যাব)
- **ZKTeco ডিভাইস** (ZktecoDevices — নতুন ট্যাব)

পুরনো routes (`/dashboard/hr/departments` ইত্যাদি) কাজ করবে যাতে কোনো bookmark/link না ভাঙে।

**Sidebar-এ যা থাকবে (১৪ items):**
পেরোল, পে-স্লিপ, কর্মচারী তালিকা, বেতন শীট, অগ্রিম বেতন, কর্মী Loan, রিজাইনেশন, উপস্থিতি, ছুটি ম্যানেজমেন্ট, কনভেয়েন্স বিল, আমার কনভেয়েন্স, **ক্যাটারিং** (নতুন), HR সেটিংস।

## ২. Catering admin menu যোগ

`/dashboard/hr/catering` পেজটা ইতিমধ্যে কোডে আছে এবং সেখানে service/provider যোগ ও weekly menu সেট করার সম্পূর্ণ UI আছে — কিন্তু sidebar-এ link নাই, তাই আপনি খুঁজে পাচ্ছেন না। শুধু sidebar item যোগ করব ("ক্যাটারিং", icon: UtensilsCrossed)।

Employee portal-এ `MyMeals` পেজ ইতিমধ্যে আছে, তারা সেখান থেকে order করতে পারবে।

## ৩. Sample facility policies seed (৩টা)

ডাটাবেজে ৩টা realistic policy insert করব যাতে আপনি বুঝতে পারেন:

1. **লাঞ্চ ভাতা** — type: food, mode: partial_subsidized, trigger: present_only, ৳50/day company share, ৳30/day employee share
2. **বাড়ি ভাড়া ভাতা** — type: accommodation, mode: house_rent_allowance, trigger: always, ৳5000/month
3. **ওভারটাইম খাবার ভাতা** — type: overtime_food, mode: per_duty_day_cash, trigger: overtime_only, ৳120/day

## Technical notes
- `AppSidebar.tsx`: HR ও পেরোল section trim করব
- `HrSettings.tsx`: নতুন ট্যাব যোগ করব, existing component গুলো reuse করব (re-import)
- ৩টা policy insert করতে data insert query চালাব
- Routes অপরিবর্তিত থাকবে — শুধু sidebar visibility বদলাবে
