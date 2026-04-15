

## Plan: Switch to RouterOS API Protocol (Port 8728)

### Problem
The current `fetch-mikrotik-ppp` edge function uses HTTP REST API (`/rest/ppp/secret`), which requires the **www** service enabled on MikroTik. But your devices only have the **API service** (port 8728) enabled — this uses MikroTik's proprietary binary protocol over raw TCP, not HTTP.

### Solution
Rewrite the edge function to use MikroTik's native RouterOS API protocol via `Deno.connect()` (raw TCP). The protocol works like this:

```text
TCP Connect → Send /login sentence → Authenticate
  → Send /ppp/secret/print sentence → Receive PPP users
  → Parse response → Upsert to mikrotik_clients
```

### RouterOS API Protocol (how it works)
- Each "word" is length-prefixed (variable-length encoding)
- A "sentence" is a sequence of words terminated by an empty word (0x00)
- Login: send `/login`, `=name=admin`, `=password=xxx`, then empty word
- Fetch PPP: send `/ppp/secret/print`, then empty word
- Response comes back as `!re` sentences with `=name=...`, `=password=...`, etc.

### Changes

**1. Rewrite `supabase/functions/fetch-mikrotik-ppp/index.ts`**
- Implement RouterOS API protocol helper functions:
  - `encodeWord(word)` — length-prefix encoding
  - `writeSentence(conn, words[])` — send a sentence
  - `readSentence(conn)` — read a response sentence
- Login flow: `/login` + credentials
- Fetch PPP secrets: `/ppp/secret/print`
- Parse `!re` responses into objects
- Use `device.api_port` directly (default 8728) — no more port guessing
- Keep the same filtering logic (skip usernames already in `clients` table)
- Keep the same upsert logic to `mikrotik_clients`

**2. Also update `supabase/functions/enforce-billing/index.ts`**
- The billing enforcement function also needs to use RouterOS API to disable PPP users
- Change from HTTP REST (`/rest/ppp/secret/set`) to RouterOS API (`/ppp/secret/set`)

### Files
| File | Action |
|------|--------|
| `supabase/functions/fetch-mikrotik-ppp/index.ts` | REWRITE — use RouterOS TCP API instead of REST |
| `supabase/functions/enforce-billing/index.ts` | UPDATE — use RouterOS TCP API for disabling PPP users |

### Key Technical Detail
```text
// RouterOS API word encoding (length prefix)
length < 0x80       → 1 byte
length < 0x4000     → 2 bytes (0x80 | high, low)
length < 0x200000   → 3 bytes
length < 0x10000000 → 4 bytes
```

No new dependencies needed — pure TCP via `Deno.connect()`.

