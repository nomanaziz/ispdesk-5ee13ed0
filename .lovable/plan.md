

User চান ৩টা global UI উন্নতি যা পুরো software-জুড়ে apply হবে:

### ১. Global Table Improvements (সব page)
**Approach:** `src/components/ui/table.tsx`-এ একবার change করলেই সব 128+ table page-এ প্রভাব পড়বে (zero-touch global change)।

- **Zebra striping (alternating colors):** `TableBody`-তে `[&_tr:nth-child(even)]:bg-muted/30` যোগ করব → odd/even row alternate background।
- **Full borders:** `TableRow`-তে `[&_td]:border-r [&_th]:border-r last:[&_td]:border-r-0 last:[&_th]:border-r-0` + `Table`-এ `border-collapse` → প্রতিটা cell-এ border।
- **Compact padding:** `TableCell` `p-4` → `p-2`, `TableHead` `h-12 px-4` → `h-9 px-2` → information density বাড়বে।
- **Header background:** `TableHeader`-এ `bg-muted/50` → header আলাদা দেখাবে।

### ২. OnlineClientMonitoring page-specific fixes (`src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx`)

- **"R.Days" column remove** (line 454 + corresponding TableCell line 502) — এটাই "8 days" দেখাচ্ছিল।
- **Status column**: full text Badge → শুধু একটা ছোট icon (green dot ✓ অথবা red ✗)। 
  ```
  Online  → 🟢 small green dot
  Offline → ❌ small red cross
  ```
- **Action buttons (4টা)** → 2x2 grid (উপরে 2, নিচে 2):
  ```
  [Activity] [Radio]
  [Rotate]   [SMS]
  ```
  `flex-row gap-1` → `grid grid-cols-2 gap-0.5 w-fit`, button size `h-7 w-7` → `h-6 w-6`।
- **colSpan update**: 21 → 20 (R.Days removed)।

### ৩. Dark mode color softening (`src/index.css`)

বর্তমান:
```
--background: 229 30% 11%;   /* প্রায় কালো */
--card:       229 30% 14%;
--foreground: 220 20% 92%;   /* প্রায় সাদা */
```

নতুন (চোখের জন্য আরাম):
```
--background: 224 22% 16%;   /* হালকা slate-grey, কালো না */
--card:       224 20% 19%;
--popover:    224 20% 19%;
--secondary/muted/accent: 224 18% 23%;
--border/input:           224 18% 26%;
--sidebar-background:     224 22% 17%;
--sidebar-accent:         224 18% 22%;
--foreground: 220 14% 86%;   /* off-white, pure white না */
--sidebar-foreground: 220 12% 78%;
```

ফলাফল: dark mode আর "pitch black" না, একটু muted slate tone — চোখে আরাম, কিন্তু dark theme এর feel থাকবে। Text-ও pure white না, slightly off-white → contrast কমবে কিন্তু readable থাকবে।

### Files to edit
1. `src/components/ui/table.tsx` — zebra + borders + compact padding (global)
2. `src/index.css` — dark mode HSL values softer
3. `src/pages/dashboard/monitoring/OnlineClientMonitoring.tsx` — R.Days remove, status icon, action 2x2

### Note
Table-এর global change-এ প্রায় সব ERP page (BillingList, ClientList, Invoices, HR ইত্যাদি 128+ pages) automatic alternating color + borders + compact spacing পাবে। কোনো individual page edit লাগবে না।

