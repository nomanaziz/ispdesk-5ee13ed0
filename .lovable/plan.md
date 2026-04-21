

## লক্ষ্য
Sidebar reorganize — MikroTik server-কে "ডিভাইস" group-এর under এ আনা, যাতে সব device এক জায়গায় থাকে।

## পরিবর্তন (শুধু `src/components/AppSidebar.tsx`)

### আগে
```
MikroTik সার্ভার (top-level group)
  ├─ সার্ভার                → /dashboard/mikrotik/servers
  └─ সার্ভার ব্যাকআপ         → /dashboard/mikrotik/backup

ডিভাইস
  ├─ ড্যাশবোর্ড
  ├─ ডিভাইস ইনভেন্টরি
  ├─ অল ডিভাইস ইউজার
  ├─ জব ম্যানেজমেন্ট
  ├─ ইউজার গ্রুপ
  ├─ ব্যাকআপ সেন্টার
  ├─ শিডিউল ম্যানেজার
  └─ অডিট লগ
```

### পরে
```
ডিভাইস
  ├─ ড্যাশবোর্ড
  ├─ ডিভাইস ইনভেন্টরি
  ├─ MikroTik PPPoE          → /dashboard/mikrotik/servers   ← নতুন এখানে
  ├─ অল ডিভাইস ইউজার
  ├─ জব ম্যানেজমেন্ট
  ├─ ইউজার গ্রুপ
  ├─ ব্যাকআপ সেন্টার
  ├─ শিডিউল ম্যানেজার
  └─ অডিট লগ
```

কাজ:
1. Top-level **"MikroTik সার্ভার"** group পুরোপুরি বাদ।
2. **"MikroTik PPPoE"** নামে নতুন item যোগ "ডিভাইস" group-এ, ঠিক "ডিভাইস ইনভেন্টরি"-এর পরে। URL আগের মতই `/dashboard/mikrotik/servers` (route বদলাবে না, page intact)।
3. **"সার্ভার ব্যাকআপ"** item সম্পূর্ণ remove — কারণ "ব্যাকআপ সেন্টার" (`/dashboard/device-admin/backups`) ইতিমধ্যে এই কাজ করে। Route `/dashboard/mikrotik/backup` ও page file আপাতত intact রাখব (যদি future-এ লাগে), শুধু sidebar থেকে hide।

## যা বদলাবে না
- কোনো route/page delete হবে না
- কোনো DB / backend / permission logic বদলাবে না
- `/dashboard/mikrotik/servers` page ও তার সব functionality আগের মতই কাজ করবে
- "ডিভাইস ইনভেন্টরি" page-এর সাথে কোনো conflict নেই

## ফাইল
- `src/components/AppSidebar.tsx` — শুধু menu array adjust (lines 124–145)

approve করলে এই একটি ছোট change apply করব।

