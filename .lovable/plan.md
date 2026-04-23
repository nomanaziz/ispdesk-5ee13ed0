

## POP Admin Sidebar — MikroTik Group Merge into Client

### বর্তমান অবস্থা
POP Admin sidebar-এ এখন আলাদা দুটো group আছে:
- **মাইক্রোটিক ক্লায়েন্ট** — মাইক্রোটিক ইউজার, বাল্ক ক্লায়েন্ট ইম্পোর্ট
- **ক্লায়েন্ট** — Add Client, Excel Bulk Import, Client List, Billing List, Daily Collection, Left Clients, Scheduler

### পরিবর্তন
`src/components/ResellerLayout.tsx`-এ "mikrotik" group **পুরোপুরি বাদ** এবং এর items "client" group-এর মধ্যে merge হবে। নতুন order:

```text
ক্লায়েন্ট (Client)
├─ ক্লায়েন্ট যোগ           (Add Client)
├─ ক্লায়েন্ট তালিকা         (Client List)
├─ মাইক্রোটিক ইউজার          ← MikroTik group থেকে আনা
├─ এক্সেল ইম্পোর্ট           (Excel Bulk Import)
├─ বাল্ক ক্লায়েন্ট ইম্পোর্ট    ← MikroTik group থেকে আনা
├─ বিলিং তালিকা
├─ দৈনিক সংগ্রহ
├─ চলে যাওয়া ক্লায়েন্ট
└─ শিডিউলার
```

### Code-level changes (ResellerLayout.tsx only)
1. Lines 65–71 (পুরো `mikrotik` group object) — **delete**
2. Lines 81–91 (`client` group items array) — দুটো নতুন entry insert: `mikrotik-users` (Client List-এর পরে) এবং `mikrotik-users/bulk-create` (Excel Import-এর পরে)
3. `PermKey` union (line 30) থেকে `"mikrotik"` বাদ
4. Permission expand map (line 175) থেকে `mikrotik:` line বাদ
5. `client:` permission expand-এ `"mikrotik"` যোগ করা যাতে বর্তমান `mikrotik` permission-ধারী users নতুন items দেখতে পান (backward-compat)

### যা বদলাবে না
- Routes (`/pop-admin/mikrotik-users`, `/pop-admin/mikrotik-users/bulk-create`) — অপরিবর্তিত, শুধু sidebar parent বদলাবে
- Page components, RBAC enforcement, business logic
- Admin sidebar (non-POP) — affected নয়
- Mobile bottom nav, icons, styling

### Outcome
POP Admin sidebar-এ আর আলাদা "মাইক্রোটিক ক্লায়েন্ট" group থাকবে না — সব client-related items একটাই "ক্লায়েন্ট" group-এর নিচে clean ভাবে থাকবে।

