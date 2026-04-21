

## লক্ষ্য
Admin sidebar-এর প্রত্যেকটা group-এর icon-কে আলাদা আলাদা সুন্দর "rainbow" candy-tone color দেওয়া, যাতে চোখে দেখেই বোঝা যায় কোনটা কোন module।

## ডিজাইন approach

### ১. প্রতি group-এর জন্য নির্ধারিত color
`menuGroups` array-এ প্রতি group-এর `label`-কে একটা নির্দিষ্ট candy color-এ map করা হবে (Tailwind palette-এর `-500/-600` shade — গাঢ় কিন্তু সুন্দর)। Light/dark dual mode-এ readable থাকার জন্য light mode-এ `-600`, dark mode-এ `-400` ব্যবহার করা হবে।

পরিকল্পিত rainbow assignment (২৬টা group):

| Group | Color |
|---|---|
| ড্যাশবোর্ড | indigo |
| ওয়েবসাইট প্যানেল | sky |
| কনফিগারেশন | slate (neutral, gear) |
| VAS | teal |
| হোম ক্লায়েন্ট | blue |
| POP / MAC ক্লায়েন্ট | violet |
| ব্যান্ডউইথ ক্লায়েন্ট | cyan |
| ডিভাইস | emerald |
| HR ও পেরোল | pink |
| OLT ম্যানেজমেন্ট | purple |
| নেটওয়ার্ক মনিটরিং | green |
| নেটওয়ার্ক ডায়াগ্রাম | lime |
| ছুটি ম্যানেজমেন্ট | amber |
| ইভেন্ট ও ছুটি | yellow |
| সাপোর্ট ও টিকেটিং | rose |
| টাস্ক ম্যানেজমেন্ট | fuchsia |
| ব্যান্ডউইথ ক্রয় | cyan-700 |
| ক্রয় | orange |
| বিক্রয় ও সার্ভিস | red |
| ইনভেন্টরি | amber-700 |
| অ্যাসেট | stone |
| অ্যাকাউন্টিং | green-700 |
| রিপোর্ট | blue-700 |
| SMS সার্ভিস | sky-700 |
| ই-কমার্স | pink-600 |
| সিস্টেম | zinc |

প্রতিটার জন্য একটা `colorClass` string (e.g., `"text-violet-600 dark:text-violet-400"`) থাকবে।

### ২. Implementation
`AppSidebar.tsx`-এ:

- `MenuGroup` interface-এ optional `color?: string` field যোগ
- প্রতি `menuGroups` entry-তে `color` set করা (উপরের mapping অনুযায়ী)
- একটা helper `getGroupColor(group)` যেটা color class return করে, না থাকলে fallback `text-muted-foreground`/`text-slate-400`
- 4টা জায়গায় `<group.icon className="h-4 w-4 ..." />`-এ এই color class merge করা (cn দিয়ে):
  - direct collapsed (line ~577)
  - direct expanded (line ~598)
  - collapsible collapsed (line ~622)
  - collapsible expanded button header (line ~643)
- Active state-এ icon color group-color হবে না — active-এ primary color override থাকবে (existing behavior, কোনো change নাই)
- Child item icons (`<item.icon>`, line ~666)-এ parent group-এর color soft tone (opacity-70) দেওয়া হবে যাতে subtle rainbow effect থাকে কিন্তু text overpower না করে — এই জন্য `CollapsibleGroup` থেকে `groupColor` child render-এ pass হবে

### ৩. Hover ও active behavior
- Hover: existing background change (`hover:bg-muted/50`) থাকবে, icon-color hover-এ আরো গাঢ় হবে (`group-hover:text-{color}-700`) — optional, simple রাখার জন্য skip করব এবং শুধু base color দেব
- Active: existing `text-primary` override → group color এর উপরে primary বসবে (cn order maintain)

### ৪. Scope
- শুধু **admin** AppSidebar (`src/components/AppSidebar.tsx`)
- POP sidebar (`ResellerLayout.tsx`) এবং Portal sidebar এতে অন্তর্ভুক্ত নয় (user বললে পরে করব)

## যা বদলাবে না
- Group order, labels, translations
- Routing, RLS, backend
- Active highlight color (primary)
- Sidebar collapse/expand behavior
- Badge styling

## Files
- `src/components/AppSidebar.tsx` — `MenuGroup` interface-এ `color`, প্রতি group-এ color assign, 4টা icon render-এ color class merge, child item icon-এ soft inherit

## Apply-এর পরে expected
- প্রতিটা admin sidebar group-এর icon আলাদা candy/rainbow color-এ দেখাবে (indigo, sky, violet, emerald, pink, ইত্যাদি)
- Light mode-এ গাঢ় (-600), dark mode-এ উজ্জ্বল (-400) — দু'টোতেই readable
- চাইল্ড menu icon গুলোও parent-এর color tone subtle ভাবে inherit করবে
- Active item আগের মতই primary color-এ highlight হবে

