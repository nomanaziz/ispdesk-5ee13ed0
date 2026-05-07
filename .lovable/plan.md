# Theme-aware Table Heads + Rounded Table Corners

## Goal
1. টেবিলের head color hardcoded dark slate এর বদলে current theme এর `--primary` follow করবে — user যে theme select করবে, head সেই color নিবে (light + dark + future themes)।
2. পুরা টেবিলে subtle radius (rounded corners) — design-wide radius pattern এর সাথে match করতে।

## Changes

### 1. `src/index.css` — Make table tokens theme-driven
- Light mode (line 44-48): `--table-head` কে fixed `224 30% 14%` থেকে → `var(--primary)` reference করে দেব। `--table-head-foreground` → `var(--primary-foreground)`।
- Dark mode (line 98-99): একই — `--table-head: var(--primary); --table-head-foreground: var(--primary-foreground);`
- ফলে যে কোনো theme switch (purple, blue, green, red etc.) করলেই সব টেবিলের head সেই color নিবে।

### 2. `src/components/ui/table.tsx` — Add radius
- `Table` (outer wrapper div): add `rounded-lg overflow-hidden border border-[hsl(var(--table-border))]`; `<table>` element থেকে border সরিয়ে wrapper-এ আনব যাতে rounded corners ঠিকমত clip হয়।
  - Wrapper: `<div className="relative w-full overflow-hidden rounded-lg border border-[hsl(var(--table-border))]"><div className="overflow-auto"><table .../></div></div>`
  - `<table>`: `border-collapse w-full caption-bottom text-sm` (no outer border)।
- `TableHeader`: existing `bg-[hsl(var(--table-head))]` already পাবে নতুন theme color। কিছু extra করতে হবে না।
- `TableHead` (th): বর্ডার separator `[&_th]:border-r [&_th]:border-white/10` already আছে — theme-color এর উপর সাদা subtle separator দেখতে ঠিকঠাক থাকবে।

### 3. Active row contrast safety
- যেহেতু head এখন primary color (purple-ish in default), white separator/text এখনও readable। Future light primary theme এর জন্য `--primary-foreground` already paired — কোনো change দরকার নেই।

## Out of Scope
- `index.css`-এর `thead th` global override (line 205-211) — already `var(--table-head-foreground)` use করছে, untouched।
- Per-page table customizations — still neutralized by global override।
- Sidebar / button / page header — untouched।

## Visual Result
- Default purple theme → head purple।
- যদি user ভবিষ্যতে theme switcher দিয়ে blue/green theme select করে, head সেই color এ repaint।
- সব টেবিলের চারকোণা soft rounded (radius 0.5rem)।
