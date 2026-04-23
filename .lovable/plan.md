

## সব Widget + Sub-menu + POP Admin-এ Icons8 Mix Coverage

### সমস্যা (verified)
১. **Admin Dashboard widgets** (`src/pages/Dashboard.tsx`) — ৬০+ stat card (`<StatCard>`) এবং ৭টা section header (`<SectionCard>`) — সব এখনো hand-rolled lucide icon ব্যবহার করছে, Icons8 কোথাও যাচ্ছে না।
২. **Admin Sidebar sub-menu items** — resolver-এ admin route আছে কিন্তু অনেক sub-menu route যেমন `/dashboard/billing/list`, `/dashboard/clients/list` etc. partial coverage — যেগুলো resolve হয় না সেগুলো flat lucide-ই থাকছে। সেটা ঠিক আছে (mix চাই) — কিন্তু coverage বাড়াতে হবে।
৩. **POP Admin Portal sidebar** (`src/components/ResellerLayout.tsx`) — main menu group আর sub-menu items সরাসরি `<Icon className="h-4 w-4" />` render করছে, **Icons8 resolver call-ই নেই**। তাই POP Admin-এ একটা icon-ও change হয়নি।

### সমাধান — তিনটা concrete কাজ

#### কাজ ১ — Admin Dashboard widgets-এ Icons8 mix
`src/pages/Dashboard.tsx` update:
- `StatCard` component-এ নতুন optional prop `icons8?: string` যোগ
- যদি `icons8` দেওয়া থাকে এবং file exist করে → 32px Icons8 PNG render (colored tile background বহাল)
- না থাকলে → পুরনো lucide icon (mix preserved)
- ৬০+ stat call-site-এ confident match-এ `icons8` যোগ:

| StatCard title | Icons8 |
|---|---|
| মোট ক্লায়েন্ট, পেইড ক্লায়েন্ট, POP মোট ক্লায়েন্ট | `people` |
| এই মাসে যোগ, গত মাসে যোগ, নতুন ইউজার | `add-user-male` |
| হোম ক্লায়েন্ট, হোম অ্যাক্টিভ | `home` |
| সচল ক্লায়েন্ট, POP অ্যাক্টিভ | `checked` |
| বিলিং ক্লায়েন্ট, মোট বিল | `documents` |
| ফ্রি / VIP ক্লায়েন্ট | `guarantee` / `trophy` |
| মোট/হোম এক্সপায়ার্ড, বকেয়া | `high-priority` |
| পেন্ডিং ক্লায়েন্ট/টিকেট/টাস্ক | `hourglass` |
| বাতিল, সাসপেন্ড, নিষ্ক্রিয় | `cancel` |
| গ্রেস, এক্সটেন্ডেড | `clock` |
| অনলাইন ONU | `wi-fi-connected` |
| মোট POP, রেগুলার POP | `router-symbol` |
| BW রিসেলার POP, সাব-রিসেলার | `mac-client` |
| আজকের/গতকালের/মাসের সেল | `coins` |
| এই/গত মাসের মুনাফা | `positive-dynamic` / `profit` |
| কালেক্টেড বিল | `coins` |
| মোট ডিসকাউন্ট | `discount` |
| আয় (এই মাস) | `profit` |
| ব্যয় (এই মাস) | `cancel` |
| বেতন পরিশোধ | `money` |
| SMS ব্যালেন্স | `sms` |
| পেন্ডিং/প্রক্রিয়াধীন টিকেট | `online-support` |
| পেন্ডিং/প্রক্রিয়াধীন টাস্ক | `tasks` / `to-do-list` |

- `SectionCard`-ও একইভাবে — group icon-এর পাশে Icons8 mix (ক্লায়েন্ট ওভারভিউ → `people`, বিলিং → `documents`, POP নেটওয়ার্ক → `internet`, ইত্যাদি)
- যেগুলো match হয় না (যেমন rare niche stat) — lucide-ই থাকবে → "mix" feel

#### কাজ ২ — POP Admin sidebar-এ Icons8 integration
`src/components/ResellerLayout.tsx` update:
- File-এর top-এ `import { resolveIcons8 } from "@/lib/iconResolver"` + `Icons8Icon`
- Group header-এ Lucide `<Icon />` swap করে: `Icons8Icon` যদি `resolveIcons8({ label: g.label })` কিছু return করে, না হলে Lucide fallback
- Sub-item-এ একইভাবে: `resolveIcons8({ url: item.to, title: item.label })` priority
- Mobile bottom nav (`MobileBottomTabs.tsx` already updated) — ঠিক আছে

#### কাজ ৩ — Resolver expansion (POP routes-এর জন্য)
`src/lib/iconResolver.ts`-এ `ICONS8_BY_URL`-এ আরো ~40টা POP route যোগ:

```
/pop-admin/notes → documents
/pop-admin/config/zones → map-marker
/pop-admin/config/sub-zones → address
/pop-admin/config/boxes → opened-folder
/pop-admin/config/packages → stack
/pop-admin/config/districts → map-marker
/pop-admin/config/upazilas → address
/pop-admin/config/departments → organization
/pop-admin/config/designations → certificate
/pop-admin/config/devices → router-symbol
/pop-admin/mikrotik-users → server
/pop-admin/mikrotik-users/bulk-create → upload
/pop-admin/employees → people
/pop-admin/employees/add → add-user-male
/pop-admin/employees/salary-sheet → money
/pop-admin/clients/add → add-user-male
/pop-admin/clients/bulk-import → upload
/pop-admin/clients/left → cancel
/pop-admin/clients/scheduler → calendar
/pop-admin/sms/templates → documents
/pop-admin/sms/individual → people
/pop-admin/sms/send → sms
/pop-admin/sms/gateway → server
/pop-admin/sms/telegram → comments
/pop-admin/reports/* (9 routes) → bar-chart / combo-chart / pie-chart variations
/pop-admin/system/setup → administrative-tools
/pop-admin/system/bill-period → calendar
/pop-admin/system/period → schedule
/pop-admin/system/invoice → folder-invoices
/pop-admin/system/email → comments
/pop-admin/system/payment-gateways → coins
/pop-admin/system/processing-fee → coins
/pop-admin/system/automatic-process → process
/pop-admin/system/activity-log → timeline
/pop-admin/accounting/income → profit
/pop-admin/accounting/expense → high-priority
/pop-admin/accounting/cashbook → calculator
/pop-admin/fund-history/credit → positive-dynamic
/pop-admin/fund-history/debit → data-transfer
```

`ICONS8_BY_LABEL`-এ POP group label যোগ:
- "মাইক্রোটিক ক্লায়েন্ট" → `mac-client`
- "কর্মচারী" → `people`
- "ক্লায়েন্ট" → `people`
- "মনিটরিং" → `internet`
- "সাপোর্ট টিকেট" → `online-support`
- "এসএমএস সার্ভিস" → `comments`
- "হিসাব" → `calculator`
- "ফান্ড হিস্ট্রি" → `timeline`

### Files

| File | Change |
|---|---|
| `src/lib/iconResolver.ts` | ~40 POP route + 8 label mapping |
| `src/pages/Dashboard.tsx` | StatCard signature + ~60 call-site `icons8` prop + SectionCard Icons8 swap |
| `src/components/ResellerLayout.tsx` | Resolver import + group icon swap + sub-item icon swap |
| **মোট** | **৩ file** |

### Mix logic (কোথাও flat থাকবে না, কোথাও পুরনো)
- যেখানে Icons8 file `src/assets/icons/icons8/` folder-এ আছে এবং mapping দেওয়া হয়েছে → 3D colorful Icons8 render
- যেখানে nai → পুরনো lucide icon untouched, পুরনো design বহাল
- ফলে interface-এ একটা "mix" look — কিছু colorful, কিছু flat — ঠিক যেটা আপনি চেয়েছেন

### যা বদলাবে না
- Business logic, queries, RBAC, layout, chart rendering
- Hishabee/Lucide fallback chain
- Mobile shell, bottom nav (already done)
- Reseller mobile layout
- যে stat বা menu-তে confident Icons8 match নেই — flat lucide untouched

### Outcome
- **Admin Dashboard**: ৭০-৮০% widget-এ ঝকঝকে Icons8, বাকি rare ones-এ পুরনো flat — natural mix
- **Admin sidebar sub-menu**: existing coverage বহাল + কয়েকটা missing route resolver-এ যুক্ত
- **POP Admin portal**: প্রথমবারের মতো sidebar-এর main group + sub-menu-তে Icons8 আসবে — Admin portal-এর মতোই consistent look

