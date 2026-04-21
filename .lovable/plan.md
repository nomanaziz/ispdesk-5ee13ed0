

## সমস্যা
এখন `ThemeProvider` একই `localStorage` key (`ispdesk-theme-v2`) সব জায়গায় use করছে। তাই same browser/PC-তে:
- Admin dark করলে → Portal client login-ও dark
- Admin dark করলে → POP admin login-ও dark
সবাই same theme share করে ফেলছে।

আবার Portal (client) ও POP admin-এ কোনো theme switcher UI-ও নেই, কিন্তু admin-এর settings ওদের force করছে।

## সমাধান: প্রতি panel-এর আলাদা theme scope

### ১. Scope-aware ThemeProvider
`ThemeContext.tsx`-এ একটা `scope` prop যোগ করা হবে: `"admin" | "portal" | "pop" | "public"`।

প্রতি scope-এর আলাদা localStorage key:
- `ispdesk-theme-admin`
- `ispdesk-theme-portal`
- `ispdesk-theme-pop`
- `ispdesk-theme-public`

অর্থাৎ admin-এ dark mode করলে শুধু admin storage-এ save হবে, portal বা POP-এ প্রভাব পড়বে না।

### ২. প্রতি panel-এর আলাদা default
- **Admin** (`/dashboard/*`): user যা set করে (light default)
- **Portal client** (`/portal/*`): সবসময় **light**, dark mode নেই
- **POP admin** (`/pop-admin/*`): সবসময় **light**, dark mode নেই
- **Public website** (`/`): সবসময় **light**

Portal/POP/Public scope-এ theme mode `"light"` hard-locked থাকবে — admin storage থেকে dark পড়বে না।

### ৩. App.tsx routing restructure
এখন root-এ একটা `<ThemeProvider>` সব wrap করছে। সেটা সরিয়ে route group-অনুযায়ী আলাদা provider:

```text
<LanguageProvider>
  Routes:
    /dashboard/*    → <ThemeProvider scope="admin">    <DashboardLayout/>
    /portal/*       → <ThemeProvider scope="portal" lockLight>  <PortalLayout/>
    /pop-admin/*    → <ThemeProvider scope="pop" lockLight>     <ResellerLayout/>
    /*              → <ThemeProvider scope="public" lockLight>  <PublicLayout/>
```

`lockLight` prop থাকলে provider সবসময় light force করবে এবং `updateSettings` দিয়ে mode change ignore হবে।

### ৪. ThemeCustomizer/QuickSettings UI
- Admin-এ আগের মতই full controls (mode + color + skin)।
- Portal/POP/Public layouts-এ ThemeCustomizer/QuickSettings render-ই করা হবে না (এখনো করা হচ্ছে না বলে মনে হচ্ছে, verify করব)।

### ৫. Migration safety
পুরাতন `ispdesk-theme-v2` key থাকলে এক-বার admin scope-এ migrate করা হবে, তারপর key delete। যাতে user-এর existing admin theme harano না যায়।

## যা বদলাবে না
- Color tokens (`src/index.css`) — আগের darker tone admin-এ ঠিক থাকবে
- Language toggle behavior
- Backend / database / RLS
- Routing paths

## Files
- `src/contexts/ThemeContext.tsx` — `scope` + `lockLight` props, scoped storage, light-lock guard, one-time migration
- `src/App.tsx` — root `<ThemeProvider>` সরিয়ে scope-অনুযায়ী আলাদা provider প্রতি route group-এ
- `src/components/ThemeCustomizer.tsx` / `src/components/QuickSettings.tsx` — `lockLight` হলে dark mode option hide/disable (light-only color/skin OK)

## Apply-এর পরে expected
1. Admin dark করলে শুধু admin panel dark হবে
2. Same PC থেকে portal client login করলে → light, untouched
3. POP admin login করলে → light, untouched
4. Public website সবসময় light
5. প্রতি panel স্বাধীনভাবে theme manage করবে, একে অপরকে override করবে না

