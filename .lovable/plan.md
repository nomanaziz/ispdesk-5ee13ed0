## তিনটি কাজ

### ১. Bug fix — `invalid input value for enum perm_level: "delete"`

`src/pages/dashboard/access/AppRoles.tsx` line 32-এ frontend permission options ভুল:
```
PERMISSION_LEVELS = ["view", "edit", "delete"]
```
কিন্তু DB enum হচ্ছে `('none','read','write','full')`। তাই save করতে গেলে enum error।

**ফিক্স:** Frontend-এ Bangla label সহ সঠিক enum value ব্যবহার:
```
const PERMISSION_LEVELS = [
  { value: "read",  label: "শুধু দেখা" },
  { value: "write", label: "এডিট" },
  { value: "full",  label: "পূর্ণ (ডিলিট সহ)" },
];
```
Default `read`। `none` কে আলাদাভাবে সরাসরি enable-checkbox দিয়ে handle করা হয়।

---

### ২. Bulk Action Permission (প্রতি module-এ common bulk toggles)

**Concept:** Home/Corporate/Billing client list, VAS, Inventory ইত্যাদি পেজের উপরের bulk buttons (Excel, PDF, Sync, Bulk SMS, Bulk Status Change, Bulk Disable, ইত্যাদি) — প্রতিটার জন্য per-role on/off toggle।

**নতুন টেবিল (Migration):**
```sql
CREATE TABLE public.app_role_features (
  id uuid PK,
  role_id uuid → app_roles ON DELETE CASCADE,
  scope text NOT NULL,        -- 'bulk_action' | 'dashboard_widget'
  scope_key text NOT NULL,    -- module_name (e.g. 'Home Clients') OR section key
  feature_key text NOT NULL,  -- e.g. 'export_excel', 'bulk_sms', 'widget:total_earnings'
  enabled boolean DEFAULT false,
  UNIQUE(role_id, scope, scope_key, feature_key)
);
```
GRANT + RLS (admin-only insert/update/delete, all authenticated select), পাশাপাশি একটা view `app_user_effective_features` যা current user-এর সব enabled features লিস্ট করে (super admin-এর সব true)।

**Frontend রেজিস্ট্রি** — `src/lib/featureRegistry.ts`:
```
BULK_ACTIONS = {
  "Home Clients":     [{ key:"export_excel", label:"এক্সেল" }, {key:"export_pdf", label:"পিডিএফ"},
                       {key:"client_sync", label:"ক্লায়েন্ট সিঙ্ক"}, {key:"bulk_disable", label:"বন্ধ করা"},
                       {key:"bulk_status_change", label:"স্ট্যাটাস পরিবর্তন"}, {key:"bulk_sms", label:"SMS পাঠান"}],
  "Corporate Clients":[ ...same... ],
  "Billing":          [ ...same... ],
  "Inventory Items":  [{key:"export_excel"...}, ...],
  ...
}
```
এই registry-ই source of truth।

**Hook** — `useFeatureFlag(scope, scope_key, feature_key)`:
- Super admin → `true`
- নতুবা `app_user_effective_features` থেকে lookup
- যদি কোনো row না থাকে → default `false` (নতুন role-এ সব বন্ধ; admin চালু করবে)
- protected default role-এর জন্য seed migration সব true দিয়ে initialize করতে হবে যাতে আগের behavior না ভাঙে — কিন্তু এর সবচেয়ে নিরাপদ way: যদি `app_role_features`-এ ওই role+scope-এ কোনো row-ই না থাকে → পুরনো behavior (সব visible)। শুধু একবার row insert হলেই strict enforcement শুরু হবে। Admins explicitly setup করার পরই restriction effect নেবে।

**Gating (frontend):**
পেজের bulk action buttons-এর জায়গায়:
```tsx
{can("Home Clients", "export_excel") && <Button>এক্সেল</Button>}
```
প্রথম pass-এ ৩টা মূল list pages-এ গেট করব: `clients/ClientList.tsx`, `clients/HomeClients.tsx`, `clients/CorporateClients.tsx`, `billing/BillingList.tsx`। বাকি pages registry-তে থাকবে কিন্তু gating ধাপে ধাপে।

---

### ৩. Dashboard Widget Permission

**Widget registry** — `src/lib/dashboardWidgets.ts`:
```
DASHBOARD_SECTIONS = [
  { key:"system_overview", label:"সিস্টেম ওভারভিউ", widgets:[
      { key:"this_month_sales",  label:"এই মাসের সেল" },
      { key:"today_sales",       label:"আজকের সেল" },
      { key:"billing_clients",   label:"বিলিং ক্লায়েন্ট" },
      { key:"expired_clients",   label:"মেয়াদোত্তীর্ণ" },
      { key:"vip_clients",       label:"VIP ক্লায়েন্ট" },
      { key:"total_due",         label:"বকেয়া" },
      { key:"company_earnings",  label:"কোম্পানি আয়" }, // sensitive
      { key:"total_users",       label:"মোট ইউজার" },     // sensitive
      ...
  ]},
  { key:"financial_summary", label:"আর্থিক বিবরণ", widgets:[...] },
  { key:"top_due",           label:"টপ বকেয়া", widgets:[...] },
  { key:"action_needed",     label:"অ্যাকশন প্রয়োজন", widgets:[...] },
]
```
এই widgets একই `app_role_features` টেবিলে `scope='dashboard_widget'`, `scope_key=section_key`, `feature_key=widget_key` হিসাবে save হবে।

**Gating** — `src/pages/Dashboard.tsx`-এ প্রতিটা `<MetricTile>` ও section-এর চারপাশে hook ব্যবহার করে conditional render। যদি পুরো section-এর সব widget hidden হয়, পুরো section header-ও hide। Default behavior (yet-to-setup role): সব visible — আগের মতই।

---

### UI — AppRoles পেজে নতুন দুইটা প্যানেল

বর্তমান module list-এর নিচে দুটো collapsible section যোগ করব:

1. **"কমন বাল্ক অ্যাকশন পারমিশন"** — প্রতি module group expand করলে ভেতরে registry-এর bulk action toggles
2. **"ড্যাশবোর্ড উইজেট পারমিশন"** — প্রতি dashboard section expand করলে ভেতরে widget toggles

প্রতিটা toggle change হলে `app_role_features`-এ upsert (role_id+scope+scope_key+feature_key দিয়ে)।

---

## কোড পরিবর্তনের সারাংশ

| ফাইল | পরিবর্তন |
|------|----------|
| Migration (নতুন) | `app_role_features` টেবিল + view + RLS |
| `src/lib/featureRegistry.ts` (নতুন) | bulk actions ও dashboard widgets registry |
| `src/hooks/useFeatureFlags.ts` (নতুন) | `useFeatureFlag(scope,key,feature)` + bulk version |
| `src/pages/dashboard/access/AppRoles.tsx` | enum বাগ ফিক্স + নতুন দুটো panel |
| `src/pages/Dashboard.tsx` | widget gating |
| `src/pages/dashboard/clients/ClientList.tsx` ও সদৃশ ২-৩টা | bulk button gating |

বাকি bulk-action পেজ পরবর্তী ধাপে গেট করব (registry-তে থাকবে, তাই UI-তে toggle আসবে, শুধু enforcement পরে)।

---

## প্রশ্ন

এই পুরো স্কোপ এক টানে নাকি step-by-step?
- A) এক বারে সব (migration + registry + hook + AppRoles UI + Dashboard gating + ৩টা client পেজ gating)
- B) প্রথমে শুধু bug fix + schema + AppRoles UI। Gating পরবর্তী ধাপে।

আমার সাজেশন **A** — যাতে শেষ পর্যন্ত একটা ব্যবহারযোগ্য feature পান। OK থাকলে implement শুরু করি।