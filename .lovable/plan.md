

## লক্ষ্য
দুটি সমস্যা ঠিক করা:
1. POP admin MikroTik server-এর users দেখতে পারছে না (যদিও running 3, 4 user আছে) → bulk import করতে পারছে না
2. POP admin sidebar-এ "বিলিং" আলাদা section, যা "ক্লায়েন্ট" section-এর সাথে merge করতে হবে

---

## 🔴 সমস্যা ১ — MikroTik Users খালি দেখাচ্ছে

### কারণ
`ResellerMikrotikUsers.tsx` শুধু সেই rows fetch করে যেগুলা admin manually **TransferToPop** dialog দিয়ে এই POP-এ pushed:
```typescript
.eq("transferred_to_pop_id", popId)
.eq("transferred_to_mikrotik_id", activeMt)
```
কিন্তু POP-এর branch-এ assigned MikroTik device-এর actual `mikrotik_clients` rows (যেগুলা sync থেকে এসেছে) এই filter-এ ধরা পড়ছে না। তাই display "0 users" হলেও MikroTik dashboard-এ "Running 3 / 4" দেখাচ্ছে।

### সমাধান
`ResellerMikrotikUsers.tsx` query update — POP-এর branch-এ assigned কোনো MikroTik device-এর সব `mikrotik_clients` দেখানো হবে, plus পুরোনো transferred ones-ও:

```typescript
// নতুন query (OR condition)
.or(
  `mikrotik_id.eq.${activeMt},` +
  `transferred_to_mikrotik_id.eq.${activeMt}`
)
// প্লাস: branch-scoped MT হলে সব দেখাও; না হলে শুধু transferred
```

একই logic `ResellerMikrotikBulkCreate.tsx`-এ — শুধু `transferred_to_pop_id` filter-এর বদলে: যে MT এই POP-এর branch-এ আছে, তার সব unlinked users দেখাও।

### Status badge logic update
- যদি `linked_client_id` থাকে → "Client" (সবুজ)
- যদি `transferred_to_pop_id = popId` → "Transferred to POP"
- নইলে → "Available" (gray) — POP চাইলে directly client বানাবে

---

## 🟢 সমস্যা ২ — Billing section কে Client section-এ Merge

### বর্তমান Sidebar (POP admin)
```
ক্লায়েন্ট
  ├─ ক্লায়েন্ট যোগ
  ├─ ক্লায়েন্ট তালিকা
  ├─ বিলিং ক্লায়েন্ট        ← duplicate of /billing/list
  ├─ চলে যাওয়া ক্লায়েন্ট
  └─ শিডিউলার

বিলিং                         ← এই পুরো section সরবে
  ├─ বিলিং তালিকা
  └─ দৈনিক সংগ্রহ
```

### নতুন Sidebar (merged)
```
ক্লায়েন্ট
  ├─ ক্লায়েন্ট যোগ           (Add Client)
  ├─ ক্লায়েন্ট তালিকা         (Client List)
  ├─ বিলিং তালিকা             (Billing List)        ← from বিলিং
  ├─ দৈনিক সংগ্রহ              (Daily Collection)    ← from বিলিং
  ├─ চলে যাওয়া ক্লায়েন্ট
  └─ শিডিউলার
```

- "বিলিং ক্লায়েন্ট" আর "বিলিং তালিকা" একই page (BillingList) → duplicate বাদ, একটাই থাকবে: "বিলিং তালিকা"
- "বিলিং" group entirely সরবে
- `/pop-admin/clients/billing` → backward-compat redirect to `/pop-admin/billing/list`

---

## পরিবর্তন হবে যেসব file

| File | পরিবর্তন |
|------|---------|
| `src/pages/reseller/ResellerMikrotikUsers.tsx` | Mikrotik users query — branch-scoped MT হলে সব users দেখাও |
| `src/pages/reseller/ResellerMikrotikBulkCreate.tsx` | Bulk import query — same logic, সব unlinked users আনো |
| `src/components/ResellerLayout.tsx` | "বিলিং" group সরিয়ে "ক্লায়েন্ট" group-এ items merge |
| `src/App.tsx` | `/pop-admin/clients/billing` কে `/pop-admin/billing/list`-এ redirect |

---

## পরিবর্তন হবে না
- Admin portal sidebar / billing pages
- Database schema (কোন migration লাগবে না)
- Permission system / RLS

---

## Apply-এর পরে expected ফলাফল
1. ✅ POP admin MikroTik Users page-এ এই POP-এর branch-এ assigned MT-এর সব user (3 / 4 জন) দেখাবে
2. ✅ Bulk Hardware Import-এ সব unlinked users আসবে — checkbox দিয়ে select করে client বানানো যাবে
3. ✅ POP sidebar-এ "বিলিং" আলাদা section আর থাকবে না; বিলিং তালিকা + দৈনিক সংগ্রহ "ক্লায়েন্ট"-এর under-এ আসবে
4. ✅ পুরোনো URL `/pop-admin/clients/billing` খুললেও billing list-এ চলে যাবে (broken link হবে না)

