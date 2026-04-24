

## Login Page — Clean Two-Column Redesign

### এখন কী আছে
বর্তমান `src/pages/Login.tsx`-এ already দুই-কলাম layout আছে, কিন্তু সেটা **শুধু তখনই দেখা যায় যখন `company.show_on_login = true`** — এবং দেখতে অনেক plain (simple Card, gradient background নেই, stats নেই, full height use করে না)। Reference image-এ যেটা সুন্দর দেখাচ্ছে সেটা হলো — **full-height left panel solid color + logo + tagline + stats + footer**, এবং right panel একদম সাদা + center-এ form।

### নতুন design (reference image অনুসরণে, কিন্তু আপনার site color-এ)

```text
┌──────────────────────────────┬──────────────────────────┐
│                              │                          │
│  [LOGO]  Company Name        │                          │
│                              │   আপনার অ্যাকাউন্টে        │
│                              │       লগইন করুন           │
│                              │                          │
│  বড় Heading / Tagline        │   স্বাগতম! 👋             │
│  (company tagline বা         │                          │
│   default)                   │   ইমেইল / PPP ID         │
│                              │   [____________]         │
│  ছোট subtitle text           │                          │
│                              │   পাসওয়ার্ড             │
│                              │   [____________] 👁       │
│  ┌────┐ ┌────┐ ┌────┐        │                          │
│  │5K+ │ │15+ │ │99% │        │   ☐ মনে রাখুন    ভুলে?  │
│  │গ্রাহক│ │এলাকা│ │আপটাইম│   │                          │
│  └────┘ └────┘ └────┘        │   [   লগইন করুন   ]      │
│                              │                          │
│                              │   ─────── বা ───────     │
│                              │   কভারেজ চেক · নতুন      │
│                              │      কানেকশন             │
│  ─────────────────           │                          │
│  📞 mobile · ✉ email         │                          │
│  📍 address                  │                          │
│                              │                          │
│  © 2026 Company              │                          │
└──────────────────────────────┴──────────────────────────┘
   (Solid brand color, full ht)   (White, form centered)
```

### Color & visual decisions
- **Left panel background**: site-এর `--primary` color (current theme-এর `258 90% 66%` violet) দিয়ে subtle gradient (`from-primary to-primary/85`) — reference-এর red-এর জায়গায়। ফলে আপনার website-এর সাথে color match হবে।
- **Right panel**: pure white (`bg-background`), form vertically centered।
- **Text on left**: white/white-90 — সব কিছু readable।
- **Stats numbers**: বড়, bold (1781+ এর মতো) — `system_settings.company_info` এ নেই, তাই hardcoded sensible defaults (পরে settings থেকে আনা যাবে)।

### Behavior changes
1. **Always show two-column layout** on `md+` screens (যদি `show_on_login=false` হয়, left panel-এ শুধু logo + tagline + brand colors দেখাবে, contact details hide হবে)।
2. **Mobile (< md)**: left panel hide, শুধু center form (current mobile behavior একই থাকবে)।
3. **Form unchanged**: identifier + password + remember + forgot — সব same logic, শুধু visual polish।
4. Bottom-এ "নতুন কানেকশন" এবং "কভারেজ চেক" এর ছোট link যোগ হবে (handy quick links)।

### Files যা change হবে
| File | কাজ |
|---|---|
| `src/pages/Login.tsx` | `LoginInner` component এর JSX সম্পূর্ণ redesign — full-height grid, brand-colored left panel, centered right form। `company`, `showCompany`, form state — সব logic একই থাকবে |

কোনো নতুন file, কোনো DB change, কোনো dependency add — কিচ্ছু লাগবে না।

### Outcome
- Reference image-এর মতো **পরিষ্কার দুই-ভাগের layout** — full screen height
- **Site-এর primary color** (violet) দিয়ে left panel — red নয়
- Company `show_on_login = true` থাকলে contact info, address, stats সব সুন্দরভাবে দেখাবে
- Mobile-এ automatic single-column (form only)
- Form-এর সব functionality (admin email, client PPP ID, reseller — সব) আগের মতো কাজ করবে

