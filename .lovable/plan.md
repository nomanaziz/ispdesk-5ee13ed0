

## লক্ষ্য
Admin homepage (`src/pages/Dashboard.tsx`)-এ:
1. **নতুন information section যোগ** — POP/BW breakdown + BW reseller portal stats
2. **Section-wise colorful background** — প্রতিটা section আলাদা soft color background-এ গ্রুপ, eye-catching ও easy-to-scan

## নতুন Data যোগ হবে

### A. POP & BW Pop ব্রেকডাউন
- মোট POP ম্যানেজার (`branch_managers` count)
- POP type = `bandwidth` কতজন (BW reseller)
- POP type ≠ `bandwidth` কতজন (regular POP)
- POP-এর under active client (clients যাদের `branch_id` কোনো POP-এ আছে এবং status=active)
- POP-এর under inactive client
- POP-এর under total client

### B. BW Reseller Portal Stats (যেসব BW reseller আমাদের portal নিয়েছে)
- মোট `bw_reseller_users` (sub-user count)
- Active sub-users (status=active)
- Inactive sub-users
- কতজন BW reseller নিজে আবার sub-reseller দিচ্ছে — `bw_reseller_users` যেখানে role/type='reseller' (যদি column থাকে; না থাকলে portal-এ যাদের নিজস্ব sub আছে তাদের distinct count)
- BW reseller মোট bandwidth sale (যদি data থাকে — current month)

## Section-wise Color Grouping (Vuexy/Notion style)

প্রতিটা section কে একটা soft tinted card-এ wrap করব, যাতে visual grouping পরিষ্কার হয়:

| Section | Background tint |
|---|---|
| **Client Overview** (total/home/new join) | `bg-blue-500/5` border `border-blue-500/20` |
| **Client Status** (active/inactive/expired/suspended/grace/extended) | `bg-emerald-500/5` border `border-emerald-500/20` |
| **Billing Status** (paid/due/partial/free/personal/vip) | `bg-amber-500/5` border `border-amber-500/20` |
| **Sales & Finance** (today/yesterday/month/profit) | `bg-violet-500/5` border `border-violet-500/20` |
| **POP & BW Network** (নতুন) | `bg-cyan-500/5` border `border-cyan-500/20` |
| **BW Reseller Portal** (নতুন) | `bg-pink-500/5` border `border-pink-500/20` |
| **Operations** (tickets/tasks/SMS) | `bg-orange-500/5` border `border-orange-500/20` |

প্রতিটা section-এর header-এ একটা matching color icon + title যাতে সহজেই চোখে পড়ে। ভেতরের individual stat card গুলোয় বর্তমান rainbow palette (`CARD_STYLES`) থাকবে — তাহলে section-এর soft tint background-এর উপর colorful cards "pop" করবে।

```text
┌─────────────────────────────────────────────────┐
│ 🌐 POP & BW Network          (cyan tint bg)     │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│ │ POP│ │ BW │ │Reg │ │Act │ │Inac│ │Total       │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘       │
└─────────────────────────────────────────────────┘
```

## Files
- ✏️ `src/pages/Dashboard.tsx` — query expand (POP/BW counts + BW reseller stats), নতুন 2টা section যোগ, সব section-কে colored wrapper-এ wrap
- ✏️ একটা ছোট `<SectionCard>` helper component inline তৈরি করব (tint bg + border + header) — বাইরে export করব না

## কী **হবে না**
- কোনো DB schema change নেই — সব data বিদ্যমান table থেকে আসবে (`branch_managers`, `bw_reseller_users`, `clients`)
- `CompanyOverview.tsx` (billing-overview route) touch হবে না
- বিদ্যমান chart, latest invoices table, top downloaders ইত্যাদি অপরিবর্তিত — শুধু color wrapper-এ ঢাকা পড়বে

