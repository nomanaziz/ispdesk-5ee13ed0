# Color Tone Cleanup — Pure Black Text, Dark Fixed Table Headers

আপনার অভিযোগ ঠিক — এখন ফ্যাকাশে muted-foreground (HSL 220 15% 32%) text বেশি, একেক page এ একেক রঙ, table heading গুলো light bg-primary/10 (lavender ফ্যাকাশে)। সব জায়গায় একটাই strict palette চাই: **পুরো কালো text + dark slate table heading + একই tone সব page এ**।

## ১. Global design tokens (`src/index.css`)

Light mode tokens শক্ত করব যাতে পুরো app এ এক রঙ আসে:

```text
--background:      0 0% 100%       (pure white page)
--foreground:      0 0% 0%         (pure black text — সব জায়গার default)
--card:            0 0% 100%
--card-foreground: 0 0% 0%
--muted:           220 14% 96%     (light bg only)
--muted-foreground: 220 9% 25%     (only for hint/secondary, much darker than now)
--border:          220 13% 88%
--primary:         258 90% 60%     (একই tone, accent only — heading bg নয়)

/* NEW: dedicated table-header tokens — fixed, never changes */
--table-head:            224 30% 14%   (deep slate-900)
--table-head-foreground: 0 0% 100%     (white)
--table-row-alt:         220 14% 97%   (zebra)
--table-border:          220 13% 88%
```

Dark mode এ `--foreground: 0 0% 100%` এবং `--table-head` একই deep slate রাখব যাতে দু'mode এ table head এক রকম দেখায়।

## ২. Table component (`src/components/ui/table.tsx`) — single source of truth

পুরো codebase এ ৪০+ ফাইল `Table` component use করে, তাই এখানে বদল করলে সব table এ একসাথে effect হবে।

- `TableHeader`: `bg-primary/10` সরিয়ে `bg-[hsl(var(--table-head))] text-[hsl(var(--table-head-foreground))]` — সব `th` সাদা bold uppercase tracking-wide
- `TableHead` (`th`): `text-muted-foreground` সরিয়ে `text-[hsl(var(--table-head-foreground))] font-semibold text-xs uppercase tracking-wider`
- `TableBody`: zebra rows `--table-row-alt` token দিয়ে
- `TableRow` hover: `hover:bg-muted/60` (consistent)
- Border সব `--table-border`
- `TableFooter`: same dark head tone

ফলাফল — পুরো app এর প্রতিটা table এ এক রকম dark header + পুরো কালো cell text।

## ৩. Tailwind base — pure-black default text

`src/index.css` এর `body` এ already `text-foreground` আছে, token কালো করায় সব page এ default টেক্সট কালো হবে। অতিরিক্ত utility:

```css
@layer base {
  body { @apply text-foreground; }
  /* Force black for headings & data cells unless explicitly muted */
  h1, h2, h3, h4, h5, h6, label, td, th, p, span, div { color: inherit; }
}
```

`text-muted-foreground` token-এর দাম ২৫% lightness করায় হালকা hint টেক্সটও আগের চেয়ে অনেক সাফ দেখাবে (একদম কালো না, কিন্তু ফ্যাকাশে নয়)।

## ৪. Dashboard page (`src/pages/Dashboard.tsx`) — tone unify

এখন এক page এ ৬-৭ রকম tone (sky/emerald/violet/rose/orange/lime/pink ইত্যাদি)। সীমিত করে dashboard-wide ৪টা semantic tone:

- **primary** (violet 258) — neutral / informational
- **success** (emerald) — positive metrics (online, paid, income)
- **warning** (amber) — pending / extended / due soon
- **danger** (rose) — overdue / blocked / expired

প্রতিটা `MetricTile`, `KpiCard` এই ৪টার একটা বেছে নেবে — random rainbow নয়।

`KpiCard` এর gradient সরাবো — instead solid white card, dark black value text, colored icon chip। Hero card-এ KPI text এখন সাদা গ্রেডিয়েন্টের উপর — সেটা change করে black-on-white করব যাতে dashboard এর সব card একই look দেয়।

## ৫. MetricTile / KpiCard / InfoList components

- `MetricTile`: value text already foreground কিন্তু `text-[11px] text-muted-foreground` labels গুলো কালো semibold করব
- `KpiCard`: gradient bg বাদ → white card + colored left bar + black 4xl value + colored icon chip
- `InfoList`: label-value দুটোই কালো, শুধু label `font-medium` value `font-bold`
- `ResourceGauge`: track stroke darker, label কালো

## ৬. Icons — switch to lighter / faster lucide-only

বর্তমান `Icons8Icon` (3rd-party) Dashboard অনেকটা lazy। `lucide-react` আগে থেকেই imported আছে। Dashboard থেকে `Icons8Icon` / `hasIcons8Icon` / `resolveIcons8` import সরিয়ে শুধু lucide use করব — রেন্ডার দ্রুত, bundle ছোট, এবং সব icon এ same stroke-width দেখাবে (consistency)। এই ৩টা import পুরো dashboard এ ব্যবহৃত নয় (already KpiCard/MetricTile lucide), তাই safe।

## ৭. একনজরে ফলাফল

- পুরো app এর সব text ১০০% কালো (hint বাদে — সেটাও ২৫% lightness, ফ্যাকাশে নয়)
- প্রতিটা table এ একই dark slate heading + সাদা bold uppercase th + zebra rows
- Dashboard এ আর rainbow নয় — ৪টা semantic tone
- Card pattern: white bg + black value + colored icon chip — সব page এ এক
- Icons8 dependency dashboard থেকে বাদ → faster load

## Files to edit

- `src/index.css` — token cleanup + table-head tokens + base text rules
- `src/components/ui/table.tsx` — dark fixed header, black cell text, zebra
- `src/pages/Dashboard.tsx` — tone palette ৪-এ সীমিত, Icons8 import drop
- `src/components/dashboard/KpiCard.tsx` — gradient → white+icon chip
- `src/components/dashboard/MetricTile.tsx` — labels darker
- `src/components/dashboard/InfoList.tsx` — values black bold
- `src/components/dashboard/ResourceGauge.tsx` — labels black

কোনো individual page ফাইল ছোঁয়া লাগবে না — tokens + Table component বদলালে সবগুলো একসাথে align হবে।
