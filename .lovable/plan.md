

## Dashboard Section Headings সরানো এবং পুনর্বিন্যাস

### সমস্যা
`/pop-admin/dashboard` page এ দুটো section heading আছে যা unprofessional লাগছে:
- "মূল কোম্পানির সাথে সম্পর্ক"
- "আমার কোম্পানি (Internal)"

### সমাধান

`src/pages/reseller/ResellerDashboard.tsx` এ পরিবর্তন:

1. **দুটো `<h2>` heading পুরোপুরি remove** করবো (line 208-211 এবং line 225-228)। শুধু grid গুলো রাখবো — stat card গুলো আগের মতই দেখাবে, কোনো design ভাঙবে না।

2. **Section reordering** (আপনার "উপরেরটা উপরে রাখো, মাঝখানে অন্য কিছু ঢুকায়ে নিচে দিয়ে দাও" instruction অনুযায়ী):
   - **উপরে:** Welcome card (POP Manager Dashboard) — যেমন আছে
   - **তারপর:** "মূল কোম্পানির সাথে সম্পর্ক" এর stat grid (SMS Balance, Remaining Balance, Daily Charge, ইত্যাদি ৮টা card) — heading ছাড়া
   - **মাঝখানে (নতুন position):** Charts row (Monthly New Client bar chart + অন্য chart গুলো) — যেটা আগে নিচে ছিল, সেটা মাঝে আনবো
   - **নিচে:** "আমার কোম্পানি (Internal)" এর stat grid (New Client, Total Client, Online Clients, ইত্যাদি ৮টা card) — heading ছাড়া

### Files যেগুলো edit হবে

| File | পরিবর্তন |
|------|----------|
| `src/pages/reseller/ResellerDashboard.tsx` | দুটো `<h2>` heading remove; Charts row কে দুটো stat grid এর মাঝে move |

### প্রতিশ্রুতি

কোনো stat card, chart, color, বা layout পরিবর্তন হবে না — শুধু দুটো heading সরাবো এবং charts কে মাঝখানে আনবো। সব functionality আগের মতই থাকবে।

