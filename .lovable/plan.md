# Dashboard Widget — Granular Permission (প্রতিটা widget আলাদা toggle)

## লক্ষ্য

এখন `featureRegistry.ts`-এ Dashboard widget গুলো অল্প কয়েকটা group-এ ভাগ করা — যেমন পুরো "অ্যাকশন প্রয়োজন" panel একটাই toggle (`action_panel`), পুরো "টপ বকেয়া" একটাই toggle, পুরো "আর্থিক বিবরণ" একটাই toggle, এমনকি POP hero row / জোন donut / টপ ডাউনলোডার / সমাধানকারী chart — এগুলোর জন্য কোনো toggle-ই নেই।

ব্যবহারকারী চান:
- ড্যাশবোর্ডের **প্রত্যেকটা widget আলাদা ভাবে on/off** হবে role permission থেকে।
- Default: সব on (এক click-এ চালু — এটা ইতিমধ্যে handled, row না থাকলে `useFeatureFlags` true return করে)।
- চাইলে একটা group-এর ৫টা চালু, ২টা বন্ধ — এরকম যেকোনো combination।

## পরিবর্তন

### 1) `src/lib/featureRegistry.ts` — `DASHBOARD_SECTIONS` ভাঙা ও সম্প্রসারণ

প্রতিটা section-এর `items` array ভেতরের প্রতিটা card/tile-এর জন্য আলাদা `key + label` পাবে:

- **`kpi_top`** (already 4 items) — অপরিবর্তিত।
- **`system_overview`** (already 8 items) — অপরিবর্তিত।
- **`system_resource`** — `resource_overview` সরিয়ে ভাঙা হবে: `onu_gauge`, `paid_gauge`, `collection_gauge`, `sms_balance`।
- **`pop_overview`** (নতুন group) — `total_pop`, `total_pop_clients`, `pop_active_clients`, `pop_inactive_clients`।
- **`tickets_overview`** (নতুন group) — `zone_donut`, `subzone_donut`, `pending_tickets`, `processing_tickets`, `pending_tasks`, `processing_tasks`, `monthly_problem_donut`, `top_solver_chart`।
- **`growth_charts`** (নতুন group) — `monthly_new_clients`, `top_active_users`।
- **`top_due`** — `top_due_table` সরিয়ে ভাঙা হবে: `home_due_tile`, `corporate_due_tile`, `bandwidth_due_tile`, `pop_negative_tile`, `home_due_list`, `corporate_due_list`, `bandwidth_due_list`, `pop_negative_list`।
- **`action_needed`** — `action_panel` সরিয়ে ভাঙা হবে: `overdue_billing`, `expired_clients`, `inactive_left`, `grace_extension`, `pending_tickets`, `pending_tasks`।
- **`financial_summary`** — `financial_panel` সরিয়ে ভাঙা হবে: প্রত্যেক finance metric-এর জন্য আলাদা key (এই মাসের সেল, আজকের সেল, প্রফিট, ইনকাম, ব্যয়, কালেকশন %, বকেয়া, ইত্যাদি — `Dashboard.tsx`-এর actual finance card গুলোর সাথে মিলিয়ে)।

### 2) `src/pages/Dashboard.tsx` — প্রতিটা widget এ gate

প্রতিটা card/tile/chart-কে `showW("<section>", "<key>")` দিয়ে wrap করা হবে। বর্তমানে যেগুলো wrap নেই (POP row, donut গুলো, ticket tiles, solver chart, new-client chart, top downloaders, এবং action/top-due/financial panel-এর ভেতরের individual tile গুলো) — সব wrap করা হবে।

একটা group-এর সব widget বন্ধ থাকলে সেই section-এর heading-ও hide হবে।

### 3) `src/pages/dashboard/access/RoleFeaturePanels.tsx` — UX উন্নতি

- প্রতিটা group-এর header-এ "সব চালু / সব বন্ধ" master switch যোগ — এক click-এ পুরো group toggle।
- group expand করলে individual switch গুলো আসবে (এটা ইতিমধ্যে আছে)।

### 4) ডাটাবেস

কোনো schema change লাগবে না — `app_role_features` table-এ আগের মতই `(scope, scope_key, feature_key)` row insert হবে। নতুন key গুলো প্রথমবার toggle করলে row create হবে; row না থাকলে default = on।

## প্রভাব

- Super Admin: সব দেখবে (`useFeatureFlags.isSuperAdmin` short-circuit)।
- যেকোনো role: রোল-পারমিশন পেজ → "ড্যাশবোর্ড উইজেট পারমিশন" section-এ এখন বিস্তারিত breakdown। প্রতিটা widget আলাদা toggle।
- যেই employee এই role-এ আছে, সে শুধু allowed widget গুলো দেখবে।
- Employee-only user যেমন আগে, `/dashboard/me`-এ redirect হবে (অপরিবর্তিত)।

## ফাইল সমূহ

- `src/lib/featureRegistry.ts` — registry সম্প্রসারণ
- `src/pages/Dashboard.tsx` — প্রতিটা widget-এ `showW()` gate
- `src/pages/dashboard/access/RoleFeaturePanels.tsx` — master toggle যোগ
