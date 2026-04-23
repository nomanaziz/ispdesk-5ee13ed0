

## Centralized Notice System — সব জায়গা থেকে উঠিয়ে এক জায়গায়

### লক্ষ্য
- বিদ্যমান সব notice entry point (Portal Manager > Notices, POP নোটিশ, Website > নোটিশ) থেকে notice management সরিয়ে নেওয়া।
- "সাপোর্ট ও টিকেটিং" menu-র নিচে নতুন **"নোটিশ"** sub-menu যোগ করা।
- Admin এক জায়গা থেকেই notice তৈরি করে multiple recipient group বেছে দিতে পারবে — সবাই / নির্দিষ্ট POP / নির্দিষ্ট BW POP / নির্দিষ্ট Client।
- Centralized notice automatic-ভাবে portal (`/portal/notices`), notification bell, এবং dashboard-এ দেখাবে।

### Database পরিবর্তন (Migration)

**`client_notices` table-এ নতুন columns:**
- `audience_groups text[]` — যেমন `['all_pops','all_bw_pops','all_clients']` — group-level selection
- `target_pop_ids uuid[]` — নির্দিষ্ট POP IDs (`branch_managers.id`)
- `target_bw_pop_ids uuid[]` — নির্দিষ্ট BW POP IDs (BW pop_type)
- `target_client_ids uuid[]` — নির্দিষ্ট client IDs (`clients.id`)

(পুরোনো `target_scope`, `branch_id`, `zone_id` রেখে দেওয়া — backward compatibility।)

### নতুন Page — `/dashboard/support/notices`

**File**: `src/pages/dashboard/support/Notices.tsx`

**UI Layout:**
1. **Header** — "নোটিশ ম্যানেজমেন্ট" + "নতুন নোটিশ" button
2. **List view** — সব notice দেখাবে (title, type, audience summary, pinned, active, created date, edit/delete)
3. **Create/Edit Dialog**:
   - Title, Body, Type (info/warning/success/event)
   - Pinned toggle, Active toggle, Attachment URL
   - **Audience selector** — checkbox group:
     - ☐ সকল POP
     - ☐ সকল ব্যান্ডউইথ POP
     - ☐ সকল ক্লায়েন্ট
   - **Specific selectors** (যখন কোনো group select করা না-ও থাকে):
     - "নির্দিষ্ট POP" — searchable multi-select (branch_managers থেকে regular pop)
     - "নির্দিষ্ট BW POP" — searchable multi-select (branch_managers থেকে BW pop_type)
     - "নির্দিষ্ট ক্লায়েন্ট" — searchable multi-select (clients table)
   - সব selector-এ search box (recurring pattern, ছোট 1-line search input)

### Sidebar পরিবর্তন (`AppSidebar.tsx`)

"সাপোর্ট ও টিকেটিং" group-এ নতুন entry যোগ:
```
সাপোর্ট ও টিকেটিং
  ├─ ক্লায়েন্ট সাপোর্ট
  ├─ সাপোর্ট হিস্টরি
  └─ 🔔 নোটিশ  → /dashboard/support/notices  (NEW)
```

### Routing (`App.tsx`)
- নতুন route: `/dashboard/support/notices` → `SupportNotices` page

### সরিয়ে নেওয়া হবে (Notice management UI)

| জায়গা | কী হবে |
|---|---|
| **Portal Manager** (`/dashboard/clients/portal-manage`) — "Notices" tab | tab টা সরানো হবে। News & Events, Media, Speed Test, Clients থাকবে। |
| **POP নোটিশ** (`/dashboard/branches/pop-notice`) | sidebar entry সরানো + page redirect → `/dashboard/support/notices` |
| **Website > নোটিশ** (`/dashboard/website/notices`) | এটা public website-এর notice (`website_notices` ভিন্ন table) — **এটা থাকবে**, কারণ এটা public website-এ দেখায়, portal/client-এ না। শুধু নাম পরিষ্কার রাখতে "ওয়েবসাইট নোটিশ" করে দেওয়া হবে। |

### Backend (Edge Function — `portal-data/index.ts`)

`get_notices` action update — audience filter logic যোগ:
```ts
// User type, pop_id, client_id জেনে filter করবে
// একটা notice দেখাবে যদি:
//   - audience_groups-এ match করে (all_clients/all_pops/all_bw_pops), অথবা
//   - target_client_ids-এ user থাকে, অথবা
//   - target_pop_ids/target_bw_pop_ids-এ user-এর POP থাকে
```

### Component cleanup
- `src/components/portal-manage/NoticesTab.tsx` — delete (Portal Manager থেকে সরানো)
- `src/pages/dashboard/branches/PopNotice.tsx` — delete
- `PortalManage.tsx` — `notices` tab entry সরানো

### ফলাফল

```text
Admin Workflow:
┌─────────────────────────────────┐
│ সাপোর্ট ও টিকেটিং > নোটিশ      │
└──────────────┬──────────────────┘
               ↓
   [+ নতুন নোটিশ] লিখি
               ↓
   Audience বেছে নিই:
   ☑ সকল POP
   ☑ সকল ক্লায়েন্ট
   বা/সাথে: 🔍 specific POP/BW POP/Client search-select
               ↓
   [Save] → Centralized table-এ যায়
               ↓
   Auto-distribute:
   ├─→ Portal /portal/notices (filtered by audience)
   ├─→ NotificationBell (portal-এ)
   └─→ Dashboard widget (POP/BW POP-এর জন্য)
```

- এক জায়গা থেকে সব notice manage হবে
- Duplicate UI নেই
- প্রতিটি list/select-এ search box (১০০+ POP/client হলেও সহজে খুঁজে পাবে)
- Backward compatible — পুরোনো notices ও `website_notices` (public site) আগের মতই কাজ করবে

