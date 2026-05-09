## সমস্যা

`/dashboard/monitoring/online` (OnlineClientMonitoring) পেজ disabled MikroTik secret-ওয়ালা ক্লায়েন্টও দেখাচ্ছে। এদের router-এ disable করা — connect করতেই পারবে না, তাই monitoring list-এ আসা অর্থহীন।

বর্তমান query (line 223-227):
```
.from("clients")
.select(...)
.neq("status", "left")
.eq("mikrotik_id", filterServer)
```
`mikrotik_status` filter নেই।

## ফিক্স প্ল্যান

### File: `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`

Query-তে এক লাইন যোগ:
```
.neq("mikrotik_status", "disabled")
```

ফলে:
- শুধু **enabled** MikroTik secret-ওয়ালা ক্লায়েন্ট list-এ আসবে।
- Online / Offline counts শুধু monitor-যোগ্য ক্লায়েন্টের জন্য হিসাব হবে।
- Disabled secret গুলো (auto-suspend / manual disable) আর confusion তৈরি করবে না।

### Side note

পুরোনো comment "Show ALL clients on the device — free, paid, enabled, disabled" সরিয়ে নতুন intent অনুযায়ী comment লেখা হবে।

কোনো DB / edge function পরিবর্তন লাগছে না — পুরোটাই frontend filter।