# সুন্দর Dynamic 404 Page

## লক্ষ্য

বর্তমান `src/pages/NotFound.tsx` খুবই সাধারণ ("404 / Oops! Page not found / Return to Home")। এটাকে একটা modern, branded, dynamic 404 page দিয়ে replace করব — যেটা hard refresh বা ভুল URL এর সময় সুন্দরভাবে দেখাবে।

> **Note:** যে `NOT_FOUND / bom1::...` error screenshot টা আসছে সেটা hosting platform (Vercel-style) এর infrastructure 404, app এর না। Lovable hosting (`*.lovable.app` / custom domain via Lovable) এ SPA fallback automatic — তাই hard refresh এ React Router এর `NotFound` page ই render হবে, infrastructure 404 না। যদি app অন্য কোথাও (যেমন Vercel) deploy করা থাকে, সেখানে আলাদা SPA rewrite config লাগবে — সেটা আলাদা issue, code এর না।

## নতুন 404 Page এর Design

**Layout:**
- Full-screen centered card, subtle gradient background (semantic tokens থেকে — `--background`, `--primary`, `--accent`)
- বড় animated "404" headline (framer-motion দিয়ে subtle float / fade-in)
- Decorative floating shapes / blur orbs background এ (brand color tone)
- Company logo উপরে (existing `useCompanyInfo()` hook ব্যবহার করে — uploaded logo থাকলে সেটা, নাহলে default ISP Desk logo)

**Content (Bangla + English):**
- Heading: "404"
- Subheading: "দুঃখিত, পেজটি খুঁজে পাওয়া যায়নি"
- Description: ছোট লাইন — "যে পেজটি খুঁজছেন সেটি সরিয়ে নেওয়া হয়েছে, নাম বদলেছে, অথবা কখনোই ছিল না।"
- যে invalid path এ এসেছে সেটা একটা muted code badge এ দেখাবে (debugging সুবিধা)

**Actions (buttons):**
1. **হোম পেজে যান** (Home icon) — `/` এ navigate
2. **ড্যাশবোর্ডে যান** (LayoutDashboard icon) — `/dashboard` এ navigate (যদি logged in হয়)
3. **পিছনে যান** (ArrowLeft icon) — `navigate(-1)` ব্যবহার করে browser back
4. Optional: **লগইন করুন** — যদি not authenticated

Auth status check করার জন্য existing Supabase session check pattern ব্যবহার করব যাতে context-aware buttons দেখানো যায়।

**Styling rules:**
- শুধুই semantic tokens (`bg-background`, `text-foreground`, `text-primary`, `text-muted-foreground`, ইত্যাদি) — কোনো hardcoded color না
- shadcn `Button` component (variant: `default`, `outline`, `ghost`)
- framer-motion ইতিমধ্যে project এ আছে — সেটা ব্যবহার করব entrance animation এর জন্য
- Mobile responsive — buttons stack on small screens

## Files যেগুলো বদলাবে

- **`src/pages/NotFound.tsx`** — সম্পূর্ণ rewrite নতুন design এ, useCompanyInfo + useNavigate + auth check সহ

## যা পরিবর্তন হবে না

- Routing config (App.tsx এ `*` catch-all already আছে ধরে নিচ্ছি — verify করব implementation এর সময়)
- কোনো backend / business logic না
- অন্য কোনো page না
