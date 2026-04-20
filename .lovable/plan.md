

## লক্ষ্য
পুরা website-এর সব major data table-এ একটা **consistent look** আনা:
1. **Header color** — সব table-এ same theme-based color (primary tone)
2. **Alternating row color** — এক row সাদা, পরের row primary color-এর হালকা/ফ্যাকাশে version (theme-aware)
3. **Cross/grid lines** — সব cell-এ border (এটা আগে থেকেই আছে `table.tsx`-এ ✓)
4. **Footer row** — total user count + monthly bill total + paid total + due total

## Approach: কেন্দ্রীয় (Centralized) সমাধান

প্রতিটা page-এ আলাদা করে style update না করে **`src/components/ui/table.tsx`-এ একবার পরিবর্তন** করব। এতে পুরা codebase-এর সব table (200+ জায়গায় ব্যবহৃত) automatic update হবে।

### File 1: `src/components/ui/table.tsx` (একমাত্র mandatory edit)

**TableHeader** — theme primary color tint:
```
bg-primary/10 text-foreground font-semibold
```
(dark mode-এও কাজ করবে কারণ `--primary` HSL theme থেকে আসে)

**TableBody** — alternating rows:
```
[&_tr:nth-child(odd)]:bg-background          // সাদা/base
[&_tr:nth-child(even)]:bg-primary/5           // primary-এর হালকা ফ্যাকাশে
```
পুরাতন `bg-muted/30` (gray) সরিয়ে theme-aware `bg-primary/5` ব্যবহার।

**TableFooter** — already exists, just style করব:
```
bg-primary/10 font-semibold border-t-2
```

### File 2: `src/index.css` (optional helper)
যদি দরকার হয় — একটা utility class `.table-footer-totals` যাতে number cells right-align হয়। কিন্তু সম্ভবত দরকার নেই।

## Footer Totals — কীভাবে কাজ করবে

Footer row-এ "Total / Paid / Due" দেখানো **per-page logic**, তাই এটা প্রতিটা table page-এ আলাদা ভাবে যোগ করতে হয় (data ভিন্ন, columns ভিন্ন)।

**এই round-এ scope:**
- ✅ `ClientList.tsx` — total clients + monthly_bill total (ইতিমধ্যে গত round-এ যোগ হয়েছে)
- ✅ `LeftClients.tsx` — total + due (ইতিমধ্যে যোগ হয়েছে)
- ➕ `BillingList.tsx` — total bill / paid / due যোগফল
- ➕ `DailyCollection.tsx` — total collection যোগফল
- ➕ `Bills.tsx` (bw-buy) — total bill / paid যোগফল
- ➕ `Invoices.tsx` (bw-sale) — total / paid / due
- ➕ `Collection.tsx` (bw-sale) — total collection

বাকি ১৫০+ table যেগুলোয় টাকা নেই (config tables, list tables) — শুধু header/alt-row color update পাবে (centralized via `table.tsx`), footer add করব না (অপ্রয়োজনীয়)।

## Files
- ✏️ `src/components/ui/table.tsx` — **all tables একসাথে update**
- ✏️ `src/pages/dashboard/billing/BillingList.tsx` — footer totals
- ✏️ `src/pages/dashboard/billing/DailyCollection.tsx` — footer totals
- ✏️ `src/pages/dashboard/bw-buy/Bills.tsx` — footer totals
- ✏️ `src/pages/dashboard/bw-sale/Invoices.tsx` — footer totals
- ✏️ `src/pages/dashboard/bw-sale/Collection.tsx` — footer totals

## কী **হবে না**
- কোনো config/list table যেখানে টাকা নেই (Zones, Districts, Packages, Users ইত্যাদি) — footer যোগ হবে না, শুধু color update পাবে
- কোনো data/logic পরিবর্তন — শুধু visual + footer summation
- পুরাতন কাজ (Left Clients recovery, sidebar) touch হবে না

## কেন এই approach সবচেয়ে ভালো
- **এক জায়গায় change → পুরা site update** (centralized)
- Theme switch করলে (purple/blue/green) automatic alternating color change হবে
- Future-এ নতুন table তৈরি করলে automatic same style পাবে

