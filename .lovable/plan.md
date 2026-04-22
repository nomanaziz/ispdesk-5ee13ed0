

## লক্ষ্য
গ্রাহক পোর্টালের **top-bar**-এ একটা **Notification Bell icon** যোগ করা — click করলে reference image-এর মতো একটা dropdown খুলবে যেখানে News & Events এবং Notices tab-এ recent items দেখাবে। Unread count badge সহ।

---

## সমাধান

### 1. Top-bar-এ Notification Bell
**File: `src/components/PortalLayout.tsx`** — top-bar-এ avatar dropdown-এর বামে নতুন bell button:
- Bell icon (lucide `Bell`)
- উপরে red dot/count badge — যদি unread items থাকে
- Click → Popover/DropdownMenu খুলবে (width ~360px)

### 2. Notification Popover content (reference image অনুযায়ী)
নতুন component **`src/components/portal/NotificationBell.tsx`** *(new)*:

**Header (gradient violet):**
- "Notifications" title
- Subtext: "You have **N** unread news, events and notices"

**Two pill-tabs:**
- **News & Events** (default active) — `client_news_events` থেকে
- **Notices** — `client_notices` থেকে

**List body (max-h-80, scroll):**
- প্রতি item: colored dot (random palette per index — emerald/amber/violet/sky/rose) + title + small meta (event date / "NEW" badge if created within 24h)
- Click → respective full page-এ নিয়ে যাবে (`/portal/notices`)
- Empty state: "কোনো নতুন কিছু নেই"

**Footer:**
- "View All" link → `/portal/notices`

### 3. Unread tracking (lightweight, localStorage-based)
- `localStorage.portal_notif_last_seen` = ISO timestamp
- Unread count = items with `created_at > last_seen`
- Bell click হলে last_seen update হবে → badge শূন্য
- কোনো DB schema change লাগবে না

### 4. Data source
Existing `get_notices` action **already returns both** `notices` ও `news`। Re-use করব:
```ts
const { data } = useQuery({
  queryKey: ["portal-notif"],
  queryFn: () => callPortal("get_notices"),
  refetchInterval: 60_000, // 1-min poll
});
```

### 5. Mobile behavior
- Bell সবসময় visible (mobile + desktop)
- Popover mobile-এ full-width-ish (max-w-[92vw])

---

## Technical Details

### Files
| File | Type |
|---|---|
| `src/components/portal/NotificationBell.tsx` | **new** — bell + popover UI |
| `src/components/PortalLayout.tsx` | modify — top-bar-এ `<NotificationBell />` যোগ (avatar-এর বামে) |

### UI primitives
- `Popover` (already in ui/popover.tsx) — better than DropdownMenu for rich content
- `Tabs` with pill style (or simple two-button toggle)
- Existing colorful dot palette (per memory: colorful tints, dark text)

### No backend change
- `get_notices` action আগেই আছে
- কোনো নতুন edge function action দরকার নেই
- কোনো DB migration নেই

---

## Out of scope
- Real-time push notification (Supabase Realtime)
- Per-user read/unread persistence in DB (localStorage যথেষ্ট এই scope-এ)
- Bills/Tickets-এর notification এই bell-এ আনা (শুধু news+notices)

---

## Apply-এর পরে expected
1. Portal top-bar-এ avatar-এর পাশে bell icon — unread item থাকলে red badge সহ count
2. Click করলে violet gradient header সহ popover খুলবে
3. ভেতরে News & Events / Notices — দুই tab
4. প্রতি item-এ colored dot + title + meta (date / NEW)
5. "View All" link → পুরো `/portal/notices` page
6. Bell click হলে badge clear হয়ে যায় (localStorage-এ last_seen save)

