

## Telegram Bot — Free SMS Alternative (Admin + POP, প্রতিজনের নিজের bot)

### Concept
প্রত্যেক admin / POP নিজের একটা **Telegram Bot** তৈরি করবে (BotFather থেকে — ফ্রি, ১ মিনিটে)। সেই bot-এর token system-এ save থাকবে। যখন কোনো client-এর number-এ Telegram account আছে এবং সে bot-এ `/start` করেছে — তখন SMS গেলে আগে Telegram-এ পাঠাবে (ফ্রি), Telegram-এ না থাকলে regular SMS gateway দিয়ে যাবে।

### কেন প্রতি POP/Admin আলাদা bot?
- User স্পষ্ট বলেছেন: "যার যারটা দিয়ে সে সে পাঠাবে"
- প্রত্যেকের নিজের brand name + bot username
- Client-এ আসা message-এর sender = সেই POP-এর নিজস্ব bot

### সীমাবদ্ধতা — আগেই জানিয়ে রাখি
Telegram Bot-এ message পাঠাতে হলে **client-কে আগে bot-এ `/start` চাপতে হবে** (Telegram এই rule, bypass নাই)। তাই workflow:
1. POP/Admin তার bot তৈরি করে token + bot username system-এ paste করে
2. Client-কে bot-এর link দেয় (SMS/QR-code/website-এ "Join Telegram for free notifications" button)
3. Client `/start` চাপলে — system সেই client-এর Telegram chat_id auto-link করে রাখে (mobile number match করে)
4. পরবর্তীতে যেকোনো SMS → Telegram-এ ফ্রি যাবে, না থাকলে gateway

---

### Architecture

```text
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│ Admin/POP UI    │─────▶│ Edge Function    │─────▶│ Telegram Bot │
│ (token setup)   │      │ telegram-send    │      │  API         │
└─────────────────┘      └──────────────────┘      └──────────────┘
        │                         ▲
        │                         │ fallback if no chat_id
        ▼                         │
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│ Client Linking  │      │ SMS Send Logic   │─────▶│ SMS Gateway  │
│ /start handler  │◀─────│ (existing)       │      │ (paid)       │
└─────────────────┘      └──────────────────┘      └──────────────┘
        ▲
        │
┌─────────────────┐
│ telegram-poll   │ (cron every 1 min — receives /start)
│ edge function   │
└─────────────────┘
```

---

### Database changes

**নতুন column**:
- `branch_managers`: `telegram_bot_token` (text, nullable, encrypted reference), `telegram_bot_username` (text), `telegram_bot_active` (bool default false)
- `clients`: `telegram_chat_id` (bigint, nullable), `telegram_linked_at` (timestamptz)

**নতুন tables**:
- `telegram_bot_state` — প্রতি bot-এর জন্য `update_offset` track (key: bot_owner_id)
- `telegram_link_requests` — temporary table: client-এর mobile match করার জন্য `/start <token>` এর pending requests

**Admin-এর জন্য**: `branch_managers`-এ admin-এর row না থাকলে আলাদা `system_settings` table-এ `admin_telegram_bot_*` keys রাখব (অথবা existing settings table check করব)।

---

### Implementation steps

#### ১) UI — Telegram Setup page
- **Admin portal**: `/dashboard/sms/telegram` — bot token, bot username input + "Test connection" button
- **POP portal**: `/pop-admin/sms/telegram` — same UI কিন্তু POP-এর own bot
- নিচে: bot link (`https://t.me/<bot_username>?start=link_<client_code>`) generate করা যাবে per client
- "Linked clients" list (যারা ইতিমধ্যে chat_id দিয়েছে)

#### ২) Edge function: `telegram-send`
Input: `{ owner_type: 'admin'|'pop', owner_id, recipient_phones[], message }`
Logic:
- Owner-এর bot token fetch
- প্রতি phone-এর জন্য `clients.telegram_chat_id` lookup
- chat_id থাকলে → Telegram API `sendMessage` (gateway via Telegram connector OR direct token)
- না থাকলে → fallback flag return → existing SMS path চালু থাকবে
- Result log: `sms_log`-এ `gateway_id` এর জায়গায় `delivery_channel: 'telegram'|'sms'`

#### ৩) Edge function: `telegram-poll`
- Cron প্রতি ১ মিনিটে চালাবে (pg_cron + pg_net)
- সব active bot-এর জন্য `getUpdates` long-poll
- `/start <token>` message এলে → `telegram_link_requests` থেকে token match → client-এর `telegram_chat_id` set → bot reply: "✅ আপনি সফলভাবে নোটিফিকেশনের জন্য যুক্ত হলেন"

#### ৪) Existing SMS pages-এ integration
- `Send.tsx`, `Individual.tsx`, `PopSmsSend.tsx`, `PopSmsIndividual.tsx`-এ checkbox: ☑ "Telegram-এ পাঠান (যদি linked থাকে)"
- Recipient count card-এ split: "📱 SMS: 45 জন | ✈️ Telegram: 12 জন (free)"

#### ৫) Bot token storage
দুটো option — user choose করবে:

**Option A — Connector approach** (recommended, secure):
- Telegram connector ব্যবহার, কিন্তু এটা শুধু একটা bot support করে → multi-tenant problem
- ❌ এই use case-এ fit করে না

**Option B — Self-hosted token** (এই plan-এ apply করব):
- প্রতিটা bot token `branch_managers.telegram_bot_token`-এ store
- Edge function direct `https://api.telegram.org/bot<TOKEN>/sendMessage` call করবে
- Token plain text save হবে (RLS দিয়ে secured — শুধু owner দেখবে); চাইলে pgcrypto দিয়ে encrypt
- ✅ Multi-tenant সমর্থন করে

---

### সুবিধা / অসুবিধা

| বিষয় | Telegram | SMS Gateway |
|---|---|---|
| খরচ | ফ্রি | প্রতি SMS টাকা |
| Speed | Instant | কখনো delay |
| Image/PDF | ✅ পাঠানো যায় | ❌ |
| Client setup | `/start` চাপতে হবে | কিছু লাগে না |
| Reach | শুধু Telegram user | যে কারো mobile |

→ তাই **hybrid**: Telegram first, fallback SMS।

---

### Files to create/edit

**Backend**:
- Migration: `branch_managers` + `clients`-এ telegram column, নতুন `telegram_bot_state`, `telegram_link_requests` tables
- `supabase/functions/telegram-send/index.ts` — new
- `supabase/functions/telegram-poll/index.ts` — new
- pg_cron schedule (insert tool দিয়ে)

**Frontend**:
- `src/pages/dashboard/sms/TelegramSetup.tsx` — new (Admin)
- `src/pages/reseller/sms/PopTelegramSetup.tsx` — new (POP)
- `src/components/sms/TelegramOptIn.tsx` — bot link generator + QR per client
- Sidebar links update (Admin + POP) — "Telegram Bot" menu
- Existing SMS send pages — Telegram channel checkbox + split count

---

### আপনাকে যা করতে হবে (one-time per POP/Admin)
1. Telegram-এ `@BotFather` খুলুন → `/newbot` → নাম দিন → token পান
2. সেই token system-এ paste করুন → "Test" → ✅
3. Client-দের bot link share করুন (SMS-এ একবার)
4. ব্যস — এরপর সব notification ফ্রি

### ফলাফল
- প্রতি POP নিজের bot ব্যবহার করবে — ব্র্যান্ড আলাদা
- Linked client-দের SMS খরচ ০ টাকা
- Unlinked client-দের জন্য আগের মতই SMS gateway
- Bill, due, payment, recharge — সব notification একই system-এ Telegram + SMS dual delivery

