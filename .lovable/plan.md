## Goal

All Clients table-এ "মেয়াদ" column-এর কাজ improve করা + Client Code-এ comments system যোগ করা। মোট ৩টি সাব-ফিচার:

---

### 1. "মেয়াদ" → "Exp Date" rename + improved badge

**যা পরিবর্তন হবে:**
- `ClientList.tsx` ও `BillingList.tsx`-এ column header "মেয়াদ" → **"Exp Date"** (sample image-এর মতো compact header)
- `BillingFilterPanel`-এ filter label "মেয়াদ শুরু/শেষ" → "Exp Date শুরু/শেষ"
- Color/style আগের মতই থাকবে (green/amber/red badge), শুধু label বদল
- Toast: "মেয়াদ আপডেট হয়েছে" → "Exp date updated"

**যা পরিবর্তন হবে না:**
- ClientProfile, Dashboard tile, Portal-এ "মেয়াদ" শব্দ অপরিবর্তিত (user শুধু All Clients-এর কথা বলেছেন)

---

### 2. Expiry badge popup — Temporary date + Note

বর্তমানে badge-এ ক্লিক করলে শুধু "মাসের কোন দিন" select হয় (recurring expire_day)। নতুন popup-এ ৩টি অংশ থাকবে:

```text
┌─ Expire Date ──────────────────┐
│ Permanent (recurring day):     │
│ [ Select 1-31 ]  ← আগের মতই    │
│                                │
│ One-time override (this cycle):│
│ [ Calendar pick ]   [✕ clear]  │
│                                │
│ Temporary note:                │
│ [ textarea ............ ]      │
│ [ Save ]                       │
└────────────────────────────────┘
```

**Behavior:**
- **One-time override date**: শুধু এই cycle-এর জন্য — `clients.temp_expire_date` field-এ save। Set থাকলে badge সেই date দেখাবে (recurring-এর বদলে)। Cross (✕) → both temp date + note clear → badge আগের blue/normal রঙে ফিরে যাবে।
- **Temporary note**: free-text (যেমন "client অসুস্থ", "বাড়ি গেছে, ২০ তারিখ দিবে") — `clients.temp_expire_note`-এ save। Note থাকলে badge-এর পাশে ছোট 💬 chat icon দেখাবে (image 4-এর মতো)। Icon hover → tooltip-এ note। Cross button (✕) → note-ও clear।
- **Auto-cleanup**: যখন admin "Bill Receive" দিয়ে মাসিক বিল collect করবেন (যা `expire_date` advance করে), একই transaction-এ `temp_expire_date` ও `temp_expire_note` NULL হয়ে যাবে — যাতে পরের cycle-এ আবার default state।

**DB migration:**
- `ALTER TABLE clients ADD COLUMN temp_expire_date date, ADD COLUMN temp_expire_note text;`
- `BillReceiveDialog`-এর existing update logic-এ এই দুটো field clear যোগ।

**Files to edit:**
- `src/pages/dashboard/clients/ClientList.tsx` — popup UI redesign + indicator icon
- `src/components/billing/BillReceiveDialog.tsx` — clear temp fields on payment receive
- `src/pages/dashboard/billing/BillingList.tsx` — header rename only (popup unchanged for now)

---

### 3. Client Comments + optional MikroTik sync

**UI:**
- ClientList row-এ Client Code (বা Customer Name) cell-এ একটা ছোট ⓘ info icon button যোগ (image 5-এর মতো)
- ক্লিকে dialog: **"Comments / Note"** — single textarea bound to `clients.remarks` field (already exists)
- Save → DB update। Empty save → remarks NULL।

**MikroTik sync (admin-controlled):**
- নতুন admin setting: **"MikroTik PPP secret comment-এ client remarks sync করুন"** (boolean toggle) — `system_settings` table-এ key `mikrotik_sync_comments` (default `false`)
- Setting page: `src/pages/dashboard/system/AutomaticProcess.tsx` (existing automation toggles পেজ)-এ একটা নতুন switch যোগ
- Setting ON থাকলে, comment save করার সময় frontend একটা edge function call করবে যা MikroTik-এ `/ppp/secret/set comment="..."` চালাবে
- Empty comment save করলে MikroTik-এ comment field-ও empty করা হবে (auto-remove)
- Setting OFF থাকলে শুধু DB update, MikroTik-এ touch করবে না

**Edge function:**
- `manage-mikrotik-ppp` function-এ নতুন `action: "set-comment"` যোগ — payload: `{ mikrotik_id, username, comment }`। RouterOS API-তে secret খুঁজে `/ppp/secret/set` চালাবে।

**Files to add/edit:**
- Migration: কোনো new table লাগবে না (`remarks` already আছে); শুধু `system_settings`-এ default insert বা frontend default-এ handle
- `src/pages/dashboard/system/AutomaticProcess.tsx` — toggle UI যোগ
- `src/components/clients/ClientCommentDialog.tsx` — নতুন dialog component
- `src/pages/dashboard/clients/ClientList.tsx` — info icon + dialog wiring
- `supabase/functions/manage-mikrotik-ppp/index.ts` — `set-comment` action

---

## Order of execution

ছোট থেকে বড় — প্রতিটা step শেষ করে check:

1. **Step 1** (smallest): "মেয়াদ" → "Exp Date" rename in ClientList + BillingList headers + filter
2. **Step 2**: Migration `temp_expire_date` + `temp_expire_note` → expire popup redesign → BillReceiveDialog auto-clear → 💬 indicator
3. **Step 3**: Admin setting toggle → ClientCommentDialog + ⓘ icon → `manage-mikrotik-ppp` set-comment action → wire sync

প্রতিটা step আলাদা message-এ deliver করব যাতে user verify করতে পারেন।

## Out of scope

- Existing "মেয়াদ" শব্দ অন্যান্য পেজে (Dashboard, Portal, ClientProfile) অপরিবর্তিত
- "মেয়াদ বাড়ান" bulk action button label অপরিবর্তিত
- BillingList-এর expire popup current logic অপরিবর্তিত (শুধু header rename); future iteration-এ একই popup শেয়ার করা যাবে