# Sidebar — Parent vs Sub-menu Clarity + Remove Icon Packs

## Problem
1. সাইডবারে main group (parent) আর sub-menu visually মিলে যাচ্ছে — কোনটা parent কোনটা child বোঝা যায় না।
2. Icons8 / Hishabee free icon pack এখনও sidebar-এ ব্যবহার হচ্ছে — চাই না।

## Goal
- প্রতিটা open group-এর sub-items এর বাঁ পাশে একটা সরু vertical "guide rail" (lamp/line) দেখাবে, যাতে sub-menu গুলো parent-এর under এ visually nest হয়ে আছে — পরিষ্কার বোঝা যায়।
- Active sub-item-এর সাথে rail-এ একটা ছোট হাইলাইট segment (টান) — current item কোথায় আছে সেটাও বোঝা যায়।
- Sub-item icon tile, Icons8 PNG, এবং Hishabee SVG illustration — সব sidebar থেকে remove। শুধু lucide icon, ছোট আকারে।
- Parent (group header) আগের মতই uppercase + bold থাকবে; সামান্য বড় font/weight দিয়ে hierarchy আরো জোর হবে।

## Changes

### 1. `src/components/AppSidebar.tsx` — `CollapsibleGroup` expanded sub-items block (lines 771–795)
- `<div className="mx-2 mt-0.5 space-y-0.5">` কে relative wrapper বানাব এবং বাঁ পাশে একটা continuous vertical rail যোগ করব:
  ```
  <div className="relative ml-5 mt-1 pl-4 border-l border-sidebar-border/70">
    {group.items.map(...)}
  </div>
  ```
- প্রতিটা sub-item `<NavLink>`-এ:
  - বাঁ পাশে ছোট horizontal "tick" connector: `before:absolute before:left-[-16px] before:top-1/2 before:w-3 before:h-px before:bg-sidebar-border/70`
  - Active হলে rail-এ vertical highlight segment + tick উজ্জ্বল হবে: `after:absolute after:left-[-17px] after:top-1 after:bottom-1 after:w-[2px] after:rounded-full after:bg-sidebar-primary`
  - `MenuIconTile` সরিয়ে plain lucide icon: `<item.icon className="h-4 w-4 shrink-0 opacity-70" />`
  - Active state-এ background আরো subtle: `bg-sidebar-accent text-sidebar-foreground font-medium` (আগে ছিল `bg-sidebar-primary` — সেটা parent-only রঙ থাকবে যাতে hierarchy আলাদা থাকে)। Active accent-এর বদলে subtle highlight।

### 2. Parent group header (lines 753–770) — slight emphasis bump
- Font: `text-[13px]` → `text-[12.5px] font-bold` রাখা, কিন্তু `text-sidebar-foreground` (full opacity) সবসময়, যাতে sub-menu-এর `text-sidebar-foreground/80` থেকে আলাদা দেখায়।
- `MenuIconTile` parent-এ থাকবে (filled tinted tile) — parent-এর identity tile-ই বহন করবে; sub-menu plain icon।

### 3. Direct (no children) groups — line 704–724
- কোনো পরিবর্তন দরকার নেই, parent-style হিসেবে already render হয়।

### 4. Remove icon-pack usage from sidebar
- `MenuIconTile` কে sub-items থেকে সরানো হচ্ছে (১ এ বর্ণিত)।
- Parent tile (`MenuIconTile`) থেকে `icons8` ও `customIcon` props বাদ দেব — শুধু `icon` + `tint` pass হবে। কারণ user "free icon pack" চায় না।
  - Lines 693, 715, 740, 762: `icons8={...}` এবং `customIcon={...}` props remove।
- Imports cleanup: top-of-file `ICONS8_BY_*`, `HISHABEE_BY_*` maps এবং helper functions (`icons8ForItem`, `icons8ForGroup`, `hishabeeForItem`, `hishabeeForGroup`) ব্যবহার হবে না — remove করব।

### 5. `MenuIconTile.tsx` — small cleanup
- `icons8` ও `customIcon` props internally optional হলেও সরিয়ে দেব এবং সংশ্লিষ্ট `Icons8Icon`/`HishabeeIcon` import গুলোও remove। শুধু lucide-tinted-tile path থাকবে।

## Out of Scope
- Portal sidebar (`PortalLayout.tsx`) — user just dashboard sidebar এর কথা বলেছে, কিন্তু consistency জন্য পরে আলাদা request এ করা যাবে।
- Color tokens / theme changes — already finalized, untouched।
- Collapsed (mini) sidebar — sub-items hidden; কোনো rail দরকার নেই, untouched।

## Visual Result (ASCII)
```
[●] OLT ম্যানেজমেন্ট           ← parent: tinted tile + bold uppercase
 │
 ├─ ◌ OLT / ONU ওভারভিউ        ← sub: lucide icon + tick
 ├─ ◌ OLT ডিভাইস
 ├─■ OLT Power Dashboard       ← active: rail segment হাইলাইট
 └─ ◌ ONU তালিকা
```
