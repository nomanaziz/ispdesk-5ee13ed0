

## BW Customer — Two-Layer Architecture (Always-On Billing + Optional Independent Panel)

### মূল ধারণা (User-এর কথা থেকে)

BW Customer-এর **দুটো আলাদা layer** থাকবে:

**Layer 1 — Always-On (`/bw/*`):** Admin-এর সাথে billing relationship। এই 5 menu **কখনো hide হবে না**, panel active হোক বা না হোক:
- Dashboard, Billing & Invoices, Service Orders, Support Tickets, Company Settings

**Layer 2 — Independent Panel (trial/paid activate করলে):** এটা POP Admin-এর মতো *দেখতে* হলেও **independent** — admin-এর উপর dependent না। নিজের company চালানোর জন্য সব ছোটখাটো module।

---

### সমস্যা (বর্তমান অবস্থা)

1. Panel activate হলে BW customer redirect হয় `/pop-admin/dashboard`-এ → তখন তার **own billing 5 menu হারিয়ে যায়**। সে আর admin-এর invoice দেখতে পায় না।
2. Currently `/pop-admin/*` shell reuse করায় BW customer POP Admin-এর dependent role-এ ঢুকে যাচ্ছে।
3. "My Own Setup" group-এর item-গুলো POP Admin-এর routes share করছে (`/pop-admin/clients`, `/pop-admin/billing/list`) — যা wrong (independence violate করে)।

---

### পরিবর্তন

#### 1. **`/bw/*` 5 menu always-on** (BwCustomerLayout.tsx)
কোনো change নেই — already always-on। শুধু confirm: panel active হলেও sidebar-এ এই 5 item থাকবে।

#### 2. **Panel activate হলে নতুন route prefix `/bw-panel/*`** (POP Admin-এর clone নয়)
`/pop-admin/*`-এ redirect বন্ধ করব। নতুন independent shell:

```
/bw-panel/dashboard          → Independent dashboard
/bw-panel/mikrotik           → MikroTik servers (add/edit/bulk)
/bw-panel/clients            → Own client list
/bw-panel/clients/add        → Add client
/bw-panel/clients/bulk       → Bulk import/export
/bw-panel/billing            → Own billing list
/bw-panel/billing/daily      → Daily collection
/bw-panel/tickets            → Own ticket system (separate from /bw/tickets)
/bw-panel/sms                → SMS templates + send
/bw-panel/employees          → Employee add/list + access control
/bw-panel/employees/add
/bw-panel/accounting         → Mini accounting (Income/Expense/Cashbook)
/bw-panel/reports            → Bill collection / customer / financial
/bw-panel/settings           → Company branding + invoice setup
```

#### 3. **নতুন `BwPanelLayout.tsx`** (independent shell)
- BwCustomerLayout-এর design language follow করবে (Activity icon, emerald accent, same header)।
- Sidebar-এর **শীর্ষে** small "Back to Billing" link → `/bw/dashboard` (যাতে user নিজের admin invoice-এ ফিরতে পারে)।
- Group structure POP Admin-এর মতো কিন্তু **scoped to BW customer's own data** (panel_branch_id দ্বারা)।
- কোনো "fund_history" বা admin-dependent menu থাকবে না।

#### 4. **`BwCustomerLayout` upgrade card update**
- "POP Admin খুলুন" button → "**আমার প্যানেল খুলুন / Open My Panel**" → navigate `/bw-panel/dashboard`।

#### 5. **`ResellerLayout.tsx` cleanup**
- `bw_setup` group **remove** করব। `ResellerLayout` শুধু POP Admin (reseller)-এর জন্য থাকবে।
- BW customer আর কখনো `/pop-admin/*`-এ ঢুকবে না।

#### 6. **Pages — reuse strategy**
নতুন pages thin wrappers হবে যা existing POP-admin components reuse করে কিন্তু BW shell-এ render করে:

```
src/pages/bw-panel/
  ├─ BwPanelDashboard.tsx       (new — own KPIs)
  ├─ BwPanelMikrotik.tsx        (reuse PopDevicesConfig)
  ├─ BwPanelClients.tsx         (reuse PopClients with bw scope)
  ├─ BwPanelClientAdd.tsx       (reuse PopClientAdd)
  ├─ BwPanelBulkImport.tsx      (reuse MikrotikBulkImport)
  ├─ BwPanelBilling.tsx         (reuse PopBillingList)
  ├─ BwPanelDailyCollection.tsx
  ├─ BwPanelTickets.tsx         (reuse PopTickets)
  ├─ BwPanelSms.tsx             (reuse PopSmsSend)
  ├─ BwPanelEmployees.tsx       (reuse PopEmployees)
  ├─ BwPanelAccounting*.tsx     (3 sub-pages)
  ├─ BwPanelReports.tsx
  └─ BwPanelSettings.tsx
```

#### 7. **`BwPanelProtectedRoute.tsx`** (new guard)
- `customer.type === "bw_customer"` চেক
- `panel_access_enabled === true` এবং `panel_subscription_expires_at > now()` চেক
- Fail হলে → redirect `/bw/dashboard` (5-menu portal-এ)

#### 8. **App.tsx routing**
- নতুন `/bw-panel/*` route group যোগ করব, সব `BwPanelProtectedRoute` + `BwPanelLayout`-এ wrapped।
- `/pop-admin/*`-এ BW customer-এর access বন্ধ।

#### 9. **Edge function (`portal-data`)**
- `resolvePopContext` helper এ `bw_customer` already allowed (গত round-এ fix হয়েছে) — সেটা অপরিবর্তিত।
- `bw_customer`-এর জন্য `panel_branch_id` দ্বারা data scope হবে — যা already implemented।

---

### Outcome

```
BW Customer Login করলে
  │
  ├─ /bw/dashboard (always)
  │   ├─ Dashboard
  │   ├─ Billing & Invoices       ← admin → BW billing
  │   ├─ Service Orders
  │   ├─ Support Tickets          ← admin-এর সাথে
  │   ├─ Company Settings
  │   └─ "My Panel" upgrade card
  │
  └─ Panel active হলে অতিরিক্ত access:
      /bw-panel/dashboard (independent shell)
      ├─ Dashboard, MikroTik, Clients (add/list/bulk)
      ├─ Billing list, Daily collection
      ├─ Tickets (own clients এর)
      ├─ SMS, Employees, Accounting, Reports, Settings
      └─ "← Back to Billing" link → /bw/dashboard
```

- Admin-এর সাথে billing **কখনো হারাবে না**।
- Trial নিলে user পাবে নিজের independent company panel।
- POP Admin shell আর reuse হবে না — confusion শেষ।
- Design consistency বজায় থাকবে (same icons, header pattern, mobile bottom-bar)।

