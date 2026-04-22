

## লক্ষ্য
Customer Portal Dashboard-কে আরো সমৃদ্ধ ও clickable করা — গ্রাহক যেন এক জায়গা থেকেই সব দরকারি info দেখে এবং click করে সরাসরি সেই page-এ যেতে পারে। সাথে একটা **Messages Inbox** যোগ করা।

---

## সমাধান (পরিবর্তন)

### 1. Hero stats — clickable mini summary cards (reference image-এর "PACKAGE / MONTHLY BILL / EXPIRY" concept থেকে)
Hero-এর নিচে compact icon-strip-এর জায়গায় **৪টা clickable summary card**:
- 📦 **Package** → `/portal/profile` (Migration/Update text সহ)
- 💵 **Monthly Bill** ৳XXX → `/portal/bills`
- 📅 **Expiry Date** (DD-MMM-YYYY) → `/portal/bills`
- ⬆️⬇️ **Data Used** (UpTime থাকলে show) → `/portal/live-usage`

প্রতিটা card-এ:
- বড় colorful icon
- Main value (বড় font)
- ছোট helper text ("My Profile" / "Pay Bill" type CTA)
- পুরো card hover + click → relevant page

### 2. Ledger highlight — already clickable (Pay Now button আছে), তবে পুরো ledger card-ও clickable করব → `/portal/bills`

### 3. **নতুন Messages Inbox card** (image-এর "MESSAGE" + "NOTICES" concept থেকে)
- Activity panel-এর নিচে full-width একটা new section: **Recent Messages**
- Source: `customer_messages` table (channel: sms/email)
- প্রতিটা row: channel icon (📱 SMS / ✉️ Email) + recipient + message preview + relative time
- "View All" button → `/portal/messages` (নতুন page)
- যদি খালি থাকে → friendly empty state ("কোনো message এখনও নেই")

### 4. **নতুন `/portal/messages` page**
- পূর্ণ inbox view: filter by channel (All / SMS / Email), search, pagination
- প্রতিটা message: channel badge, status (sent/delivered/failed), full content, timestamp
- Click করলে expand হয়ে full message + meta details

### 5. Quick links update
- Activity panel-এর Quick links-এ "Messages" যোগ — `BellRing` এর জায়গায় or পাশে।

---

## Technical Details

### Files to edit/create:
1. **`src/pages/portal/PortalDashboard.tsx`** — icon-chip strip-কে clickable summary cards দিয়ে replace; recent messages preview section যোগ।
2. **`src/pages/portal/PortalMessages.tsx`** *(new)* — full inbox page।
3. **`src/App.tsx`** — `/portal/messages` route যোগ।
4. **`src/components/PortalLayout.tsx`** — sidebar nav-এ "Messages" entry যোগ (Mail icon সহ, both bn/en)।
5. **`supabase/functions/portal-data/index.ts`** — দুটো নতুন action:
   - `get_dashboard` response-এ `recent_messages` (last 5) যোগ করব
   - নতুন `get_messages` action — full list with optional channel filter

### Data source:
- Table: `customer_messages` (columns: id, customer_id, channel, message, recipient, status, created_at)
- Filter: `customer_id = tok.sub` (client_id)
- Note: Currently empty (0 rows) — UI empty-state handle করব। Future-এ admin SMS/email send হলে এই table-এ insert হলেই দেখাবে।

### Click behavior:
- Card-এ `<Link>` wrap (Button asChild নয় — পুরো surface clickable)
- `cursor-pointer` + hover scale subtle effect

### Design tokens:
- বিদ্যমান colorful tints (violet/emerald/sky/amber/rose) ব্যবহার, dark text (per memory)।

---

## Out of scope
- Admin থেকে message send করার flow — already exists (sms/email modules)।
- Real-time push notification।
- Message-এ reply functionality।

---

## Apply-এর পরে expected
1. Dashboard-এ ৪টা boldly clickable summary cards (Package / Bill / Expiry / Usage)।
2. সবগুলো metric click করলে সরাসরি relevant page-এ চলে যায়।
3. Recent Messages preview card dashboard-এ থাকবে।
4. পুরো inbox `/portal/messages`-এ accessible, sidebar থেকেও।

