## Client Menu Cleanup

### কী change হবে
1. Sidebar-এর main group label **`হোম ক্লায়েন্ট` → `All Clients`** করা হবে.
2. ওই group-এর ভেতর থেকে **`সকল ক্লায়েন্ট`** submenu remove করা হবে.
3. Group-এর নিচে শুধু relevant submenu থাকবে:
   - `হোম ক্লায়েন্ট`
   - `কর্পোরেট ক্লায়েন্ট`
   - বাকি client-related tools (new request, billing, left clients, scheduler ইত্যাদি) আগের মতো থাকবে
4. Generic **`ক্লায়েন্ট তালিকা / সকল ক্লায়েন্ট দেখুন ও পরিচালনা করুন`** page আর main list হিসেবে ব্যবহার হবে না.

### Routing behavior
- Existing route `/dashboard/clients` remove না করে **redirect** করা হবে, যাতে পুরনো link বা internal navigation ভাঙে না.
- Redirect target হবে **`/dashboard/clients/home`**.
- ফলে কেউ old all-clients URL এ গেলেও সরাসরি Home Clients page-এ যাবে.

### যে file-গুলো change হবে
| File | কাজ |
|---|---|
| `src/components/AppSidebar.tsx` | Main menu label `All Clients` করা, `সকল ক্লায়েন্ট` submenu remove করা, English translation update করা |
| `src/App.tsx` | `/dashboard/clients` route-কে `Navigate` redirect করা `/dashboard/clients/home` এ |

### Technical details
- `HomeClients.tsx` already uses the Home-only filtered page, so এটাকে নতুন generic page বানানোর দরকার নেই.
- `CorporateClients.tsx` untouched থাকবে.
- `AddClient.tsx` বা অন্য কোনো place থেকে `/dashboard/clients` এ navigate হলে redirect-এর কারণে safe থাকবে.
- User-facing generic header text `ক্লায়েন্ট তালিকা` / `সকল ক্লায়েন্ট দেখুন ও পরিচালনা করুন` effectively disappear করবে, কারণ ওই standalone all-clients page আর open হবে না.

### Result
Menu structure হবে এভাবে:

```text
All Clients
  - নতুন রিকোয়েস্ট
  - হোম ক্লায়েন্ট
  - কর্পোরেট ক্লায়েন্ট
  - বিলিং তালিকা
  - দৈনিক বিল কালেকশন
  - ইনস্টলেশন ফি
  - চলে যাওয়া ক্লায়েন্ট
  - শিডিউলার
  - পরিবর্তন রিকোয়েস্ট
  - পোর্টাল ম্যানেজ
  - আপডেট রিকোয়েস্ট
```

`সকল ক্লায়েন্ট` submenu থাকবে না, আর generic all-client list page আর দেখাবে না.