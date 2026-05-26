## আপনার OLT এর actual saved data (DB থেকে)

| Field | Value | মূল্যায়ন |
|---|---|---|
| Name | AFTABNAGAR-OLT | ✅ |
| Vendor / Model | bdcom / — | ✅ |
| PON Type | gpon | ✅ |
| IP Address | 192.168.110.4 | ✅ (private LAN IP — agent থেকে reachable হতে হবে) |
| Telnet Port | 23 | ✅ |
| Username | admin | ✅ |
| Password | greendhaka | ⚠️ plain text saved (পরে encrypt করা দরকার) |
| Location | AFTABNAGAR, Dhaka | ✅ |
| SNMP Enabled | true | ✅ |
| SNMP IP | 192.168.110.4 | ✅ |
| **SNMP Port** | **162** | ❌ **ভুল — হওয়া উচিত 161** |
| SNMP Community | GxNsnMP_RO | ⚠️ আপনি বলেছিলেন "Bashundhara TC" — মিলছে না, verify করুন |
| SNMP Version | v2c | ✅ |
| OID Profile | BDCOM OLT GPON | ✅ |
| Data Source Priority | agent_first | ✅ |
| Fallback | telnet | ✅ |
| Agent Enabled | true | ✅ |
| **Assigned Agent** | **null** | ❌ **OLT কোনো agent এ assign করা নাই** |
| Status | unknown | কারণ — কখনো poll হয়নি |
| agent_last_seen / snmp_last_seen | null | কারণ — উপরের ২টা সমস্যা |

Agent **Naeem-PC** online আছে (last heartbeat ঠিক আছে), কিন্তু সে এই OLT-কে চেনে না কারণ assignment নাই।

---

## 🔴 যে ২টা ঠিক করতেই হবে

### 1. SNMP Port 162 → 161
- **161** = SNMP query port (agent → OLT, এটাই লাগবে)
- **162** = SNMP trap port (OLT → server, আলাদা feature)
- 162 দিয়ে কখনো OLT poll হবে না।

### 2. OLT-কে Agent এ assign করুন
Dashboard → **Device Admin → Polling Agents** → Naeem-PC এর "Assign OLTs" → AFTABNAGAR-OLT select → Save।
Assign না করলে agent এই device-এর জন্য কোনো job পাবে না।

---

## ⚠️ একটু verify করার বিষয়

- **SNMP Community**: আপনি বললেন "Bashundhara TC" কিন্তু save আছে `GxNsnMP_RO`। কোনটা আপনার OLT এ actually configured সেটা OLT CLI থেকে দেখে নিন (`show snmp` জাতীয় command)। ভুল community দিলে OLT কোনো reply দিবে না।
- **Password plain text** আছে — কাজ করবে কিন্তু পরে encryption যোগ করা উচিত।

---

## এখন আপনার করণীয় (এই plan-এ আমি কোনো code change করবো না — শুধু আপনি যা করবেন)

1. OLT edit করে **SNMP Port = 161** করুন।
2. OLT এর actual SNMP community confirm করে সঠিক value বসান।
3. Polling Agents পেজে Naeem-PC এ এই OLT assign করুন।
4. Agent machine থেকে test:
   ```bash
   snmpwalk -v2c -c <community> 192.168.110.4 1.3.6.1.2.1.1.1.0
   ```
   reply আসলে ৩০ সেকেন্ড পর OLT status "online" হবে এবং `agent_last_seen` update হবে।

এই plan accept করলে আমি এর পরের message-এ verify করব যে status update হয়েছে কিনা, আর চাইলে UI-তে SNMP port এর default 161 করে দিব যাতে ভবিষ্যতে এই ভুল না হয়।
