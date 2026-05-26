# ZK Binary Protocol — Live Device Connect & Fetch

আপনার device: `103.147.107.110:4370`, CommKey `1895`। বর্তমান edge function HTTP fetch করছে, যেটা ZK device-এ কাজ করে না। সম্পূর্ণ ZK binary protocol Deno-তে লিখব।

## ZK Protocol (TCP, port 4370)

প্রতিটা packet structure:
```
[Start: 0x5050827d (4 bytes)]
[Payload size (4 bytes, LE)]
[Command (2 bytes)] [Checksum (2 bytes)] [SessionId (2 bytes)] [ReplyId (2 bytes)]
[Payload (variable)]
```

Sequence:
1. **CMD_CONNECT** (1000) → device returns `session_id`
2. যদি error 5 (auth required) → **CMD_AUTH** (1102) with hashed CommKey (1895)
3. **CMD_ATTLOG_RRQ** (13) → returns attendance records (40 bytes each: user_id 9b, timestamp 4b, status 1b, …)
4. **CMD_USERTEMP_RRQ** (9) → user list (optional, for SN/auto-detect)
5. **CMD_GET_FREE_SIZES** (50) বা **CMD_OPTIONS_RRQ** (11) "~SerialNumber" → device SN
6. **CMD_EXIT** (1001) → clean disconnect

## ফাইল

**`supabase/functions/sync-zkteco-data/index.ts` সম্পূর্ণ rewrite:**
- `zkteco.ts` helper module same folder-এ:
  - `createPacket(cmd, sessionId, replyId, data)` — checksum সহ
  - `parseHeader(buf)` — command, sessionId extract
  - `commKeyHash(key, sessionId)` — ZK-এর XOR-based hash algorithm
  - `decodeAttendance(buf)` — 40-byte records → array
  - `decodeUserInfo`, `parseSerialNumber`
- `index.ts`:
  - `Deno.connect({hostname, port: 4370, transport: "tcp"})` দিয়ে socket open
  - 5s timeout সহ handshake → auth → SN fetch → ATTLOG fetch → exit
  - Serial Number device থেকে এসে DB-তে save (auto-detect)
  - Attendance records existing `zkteco_attendance_logs` table-এ insert + employee mapping logic আগের মতই
  - Response: `{ ok, serial_number, synced_count, sample_logs: [...first 3] }`

## Testing flow

1. Frontend-এ device add: name "Live Test", IP `103.147.107.110`, port `4370`, comm_key `1895`, blank SN
2. সিঙ্ক button click → edge function call
3. Edge function: connect → auth (1895) → SN fetch → DB update → ATTLOG fetch → response
4. UI toast: "সিঙ্ক সফল! N records, SN: XYZ"
5. যদি fail: error message সহ — connection refused / auth failed / timeout

## ঝুঁকি

- **Outbound TCP from Supabase edge:** Deno Deploy / Supabase Edge runtime `Deno.connect()` allow করে (verified pattern)। যদি block করে, fallback ADMS Push।
- **Firewall:** আপনার device public IP-তে আছে, port 4370 internet-এ exposed — শুধু server side test করেই বুঝব।
- **Protocol variant:** কিছু নতুন ZKTeco firmware compressed/extended packet ব্যবহার করে। প্রথম attempt standard protocol-এ; না হলে log দেখে adjust করব।

## Verification steps (build mode-এ)

1. Edge function deploy
2. Direct curl test দিয়ে edge function call (test_edge_functions বা curl)
3. Edge function logs check করে handshake/auth response দেখা
4. সফল হলে SN + record count report

কোন secret লাগবে না — device-এর IP/Port/CommKey সব DB-তে stored আছে।

Approval দিলে implement শুরু করব।
