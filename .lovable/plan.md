## লক্ষ্য

POP/MAC (Reseller) portal, BW Panel (POP-style admin for BW customers), এবং BW Customer portal — তিনটাই এখন আলাদা bespoke layout ব্যবহার করছে। এগুলোকে main admin dashboard-এর সাথে exact same design pattern-এ আনা:

- Shadcn `SidebarProvider` + `Sidebar collapsible="icon"` (mini-rail collapse সহ)
- Same colorful group color tokens (`GROUP_COLORS` map)
- Same `MenuIconTile` colored icon tiles
- Same TopBar (logo, search, theme switcher, language toggle, notes, install button, clock, user menu)
- Theme settings (sidebar collapsed memory, content width) সম্মান করে
- Mobile-এ existing mobile shells অপরিবর্তিত থাকবে

## Step-by-step plan

### Step 1 — Shared building blocks
- `src/components/portal-shell/PortalSidebarBase.tsx` — generic shadcn-sidebar renderer যেটা `MenuGroup[]` নেয় এবং AppSidebar-এর exact look reproduce করে (color groups, scroll area, search, collapsible groups, active-route highlighting, mini-rail icon-only mode)।
- `src/components/portal-shell/PortalTopBar.tsx` — main `TopBar`-এর portal version: `SidebarTrigger`, search, theme switcher, language toggle, notes, install, clock, customer dropdown (logout)।
- Reuse existing `GROUP_COLORS` ও `MenuIconTile` (export from `AppSidebar.tsx` যদি না থাকে — বা কপি করে portal-shell-এ রাখা)।

### Step 2 — POP/MAC Reseller portal
- New sidebar: `src/components/portal-shell/ResellerSidebar.tsx` — current `groups[]` array থেকে `MenuGroup[]` shape-এ convert; sub-user permission filter + bw_customer guard বহাল।
- Rewrite `src/components/ResellerLayout.tsx`:
  - `SidebarProvider defaultOpen={!settings.sidebarCollapsed}` দিয়ে wrap
  - `<ResellerSidebar/>` + `<PortalTopBar variant="reseller"/>` + `<main>{children}</main>`
  - Mobile-এ existing `ResellerMobileShell` অপরিবর্তিত
- কোনো route বা page change করা হবে না — শুধু shell swap।

### Step 3 — BW Panel portal
- `src/components/portal-shell/BwPanelSidebar.tsx` — `BwPanelLayout` থেকে `groups[]` reuse, MenuGroup-এ convert; "Back to BW Customer" link আলাদা footer item হিসেবে।
- Rewrite `src/components/BwPanelLayout.tsx` — same `SidebarProvider`+TopBar pattern।

### Step 4 — BW Customer portal
- `src/components/portal-shell/BwCustomerSidebar.tsx` — flat `navItems[]` MenuGroup-এ; "POP Admin Open" CTA footer-এ যদি panel active।
- Rewrite `src/components/BwCustomerLayout.tsx` — same shell।

### Step 5 — QA
- Light/Dark/colorful theme-এ তিন portal চালিয়ে দেখা
- Sidebar collapse/expand, mobile drawer, sub-user permission filter, active highlight, group colors verify
- কোনো page break না হয় তা confirm (route/path অপরিবর্তিত)

## Technical notes

- `AppSidebar`-এর core helpers (`GROUP_COLORS`, `getGroupColor`, color-resolved icon tile) `portal-shell/sidebarUtils.ts`-এ extract করে তিন portal sidebar-এ share করা হবে।
- `ThemeContext` (already imported in DashboardLayout) তিন portal-এ inject করা হবে — `settings.sidebarCollapsed` ও `settings.contentWidth` সম্মান।
- `usePortalAuth` (customer) ও `useAuth` (admin user) আলাদা — `PortalTopBar`-এ `usePortalAuth` ব্যবহার হবে এবং admin-only বাটন (QuickCreateMenu, AdminNotificationBell, GlobalClientSearch) hide।
- কোনো route, page বা business logic পরিবর্তন হবে না — শুধু presentational shell।
- `Icons8Icon` resolver থাকবে — main AppSidebar-এ এটা use হয় নি কিন্তু portal-গুলো ব্যবহার করে; user বললে remove করা যাবে, এই plan-এ রাখা হয়েছে কারণ ফলাফল main dashboard-এর সাথে exact match হলে user আবার বলবে।

## Files affected (no route changes)

```text
NEW   src/components/portal-shell/sidebarUtils.ts
NEW   src/components/portal-shell/PortalSidebarBase.tsx
NEW   src/components/portal-shell/PortalTopBar.tsx
NEW   src/components/portal-shell/ResellerSidebar.tsx
NEW   src/components/portal-shell/BwPanelSidebar.tsx
NEW   src/components/portal-shell/BwCustomerSidebar.tsx
EDIT  src/components/ResellerLayout.tsx        (rewrite shell only)
EDIT  src/components/BwPanelLayout.tsx         (rewrite shell only)
EDIT  src/components/BwCustomerLayout.tsx      (rewrite shell only)
```

Step 1 → 2 → 3 → 4 → 5 ক্রমে এক এক করে ship করব; প্রতিটার পরে আপনি check করে confirm দিলে পরেরটায় যাব।
