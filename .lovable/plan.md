# ZKTeco Device Form — TCP/IP + ADMS Push + Auto Serial

বর্তমানে form-এ IP, Port, API ID/Password, Serial, Location আছে। ZKTeco device-এ আসলে যেটা দরকার সেটা হল **Comm Key** (4-digit communication password, e.g. `0`, `1895`)। আর ADMS Push mode আলাদা — সেখানে device নিজে server-এ data পাঠায়, IP-Port লাগে না, শুধু **Serial Number** আর **Cloud URL** দরকার।

## ১. Database migration

`zkteco_devices` table-এ ২টা column যোগ:
```text
+ connection_type  text   default 'tcp_ip'   ('tcp_ip' | 'adms_push')
+ comm_key         int    default 0           (ZKTeco communication password)
```
`ip_address`, `port` কে nullable করব (ADMS mode-এ লাগবে না)।

## ২. Form পরিবর্তন (`ZktecoDevices.tsx`)

সবার উপরে একটা **Connection Type** dropdown:

| Connection Type | যে field গুলো দেখাবে |
|---|---|
| **TCP/IP** (default) | IP Address\*, Port (default 4370), **Comm Key** (default 0, e.g. 1895) |
| **ADMS Push** | একটা info box — "ADMS server URL দিন device-এ: `https://<project>.supabase.co/functions/v1/zkteco-adms`" + Serial Number field |

সব mode-এ common: Device Name\*, Location, Status।

**Serial Number** field-এ helper text: *"খালি রাখুন — প্রথম sync-এ device থেকে auto-detect হবে"*। TCP/IP mode-এ optional, ADMS mode-এ required (device push-এ এটা দিয়েই চেনা হবে)।

API ID/API Password field দুটো সরিয়ে দেব — ZKTeco hardware-এ এগুলা লাগে না, পুরোনো ভুল ছিল।

## ৩. List table পরিবর্তন

"IP : Port" column-কে **Connection** column করব:
- TCP/IP → `192.168.1.201:4370` badge সহ
- ADMS → `ADMS Push` badge + SN

## ৪. Sync edge function (`sync-zkteco-data`)

ছোট update: response-এ `serial_number` ফেরত আসলে DB-তে save করব (auto-detect)। Connection type অনুযায়ী আলাদা path:
- `tcp_ip` → existing IP-port flow (comm_key পাঠাব authentication-এ)
- `adms_push` → শুধু last_sync timestamp আপডেট (data device push করবে আলাদা endpoint-এ; future scope)

ADMS receiver endpoint পরে আলাদা task-এ করব — এই plan-এ শুধু form + DB।

## ৫. ক্রম
1. Migration (alter table, 2 columns, nullable IP/Port)
2. `ZktecoDevices.tsx` rewrite — dynamic form
3. `sync-zkteco-data` edge function-এ auto ser