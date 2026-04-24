## আইকন slow-load সমস্যা — দুই-স্তরের সমাধান

### সমস্যা কেন হচ্ছে
আইকনগুলো `src/assets/icons/icons8/*.png` (১৫২টা) আর `hishabee/*.{svg,png}` থেকে আসে। `Icons8Icon.tsx` ও `HishabeeIcon.tsx`-এ এখন warm-cache আছে, কিন্তু সেটা **`requestIdleCallback`** দিয়ে চলে — মানে browser যখন ফাঁকা সময় পাবে তখন download হবে। ফলে:
- প্রথম রেন্ডারে browser আগে text/JSON ডেটা ফেচ করে, idle হলে তবেই icon আনতে শুরু করে → আইকনগুলো **এক এক করে পরে আসে** (text first, icon later flash)।
- প্রতিবার Vite dev server বা বড় বিল্ডে নতুন hash হলে cache miss হয় → আবার সব ছবি ফেচ।
- প্রতি page transition-এ যদি ক্যাশে না থাকে, browser আবার সার্ভার থেকে ফেচ করে (small but visible)।

### সমাধান (একসাথে দুটোই — আপনি "দুটাই" বলেছেন)

#### ১. Boot Splash Loader — প্রথমবার লোডের সময়
- `index.html`-এ pure-HTML splash screen যোগ হবে (logo + "Loading..." + spinner) — React চালু হওয়ার আগেই দেখাবে।
- নতুন `BootGate` component:
  - App startup-এ সব Icons8 + Hishabee আইকন **parallel-এ download** করবে (`Promise.all` of `img.decode()`)।
  - সব আইকন ready হলে `BootGate` children render করে splash সরিয়ে দেবে।
  - timeout 3s — যেন slow connection-এ ও জাম না হয়।
- শুধু **প্রথম session-এ** চলবে: `sessionStorage["icons-warmed"]="1"` দিয়ে check। refresh/page-switch-এ আর splash দেখাবে না।

#### ২. Aggressive synchronous preload — সব render-এর জন্য
- `Icons8Icon.tsx` ও `HishabeeIcon.tsx`-এ warm-cache function থেকে `requestIdleCallback` সরানো হবে। সরাসরি module import হওয়ার সাথে সাথেই `new Image().src = ...` চালু হবে — browser তখনই parallel-এ HTTP/2-তে সব আইকন pull করতে শুরু করবে।
- `<link rel="preload" as="image">` tag-গুলো `index.html`-এ inject করা হবে (top ~24টা most-used: business, manager, documents, online-support, address-book, settings, people, etc.) — এতে বড় bundle-এর আগেই browser preload শুরু করে।
- `<img>`-এ `loading="eager"` + `fetchpriority="high"` (already আছে) বহাল থাকবে।

#### ৩. PWA cache rule strengthening
- `vite.config.ts`-এর `image-cache`-এর `maxEntries: 100` → `300` এবং `maxAgeSeconds: 30 দিন → 90 দিন` করব। প্রথমবার ডাউনলোডের পরে আর কখনো server hit হবে না (production PWA-এ — preview iframe-এ SW disabled আছে, যা ঠিক আছে)।

### Files যা change হবে
| File | কাজ |
|---|---|
| `index.html` | Splash HTML + spinner CSS + top icon `<link rel="preload">` |
| `src/main.tsx` | Splash hide hook (BootGate-এর সাথে coordinate) |
| `src/components/BootGate.tsx` (নতুন) | Parallel preload সব আইকন → splash hide → render children |
| `src/App.tsx` | `<App>` কে `<BootGate>` দিয়ে wrap |
| `src/components/icons/Icons8Icon.tsx` | warm-cache সরাসরি (idle ছাড়া) চালু |
| `src/components/icons/HishabeeIcon.tsx` | একই |
| `vite.config.ts` | image-cache `maxEntries 300`, `maxAge 90d` |

কোনো DB change লাগবে না, কোনো নতুন dependency নেই।

### কী পাবেন
- **প্রথমবার ওয়েবসাইট খুললে** ছোট splash ("Loading..." + logo) ~1-2 sec দেখাবে — তারপর পুরো dashboard একসাথে আইকন সহ আসবে। আর "text আগে, icon পরে" flash দেখবেন না।
- **পরের সব page change/login/refresh-এ** আইকন already memory + browser cache-এ থাকবে → instant render।
- **PWA-তে প্রথম visit-এর পরে** ৯০ দিন পর্যন্ত আইকন cache-এ থাকবে — server থেকে আর ফেচ হবে না।
- প্রতিটা portal (admin, POP/reseller, client, BW) একই উন্নতি পাবে কারণ সব একই `Icons8Icon`/`HishabeeIcon` ব্যবহার করে।

### আপনার দ্বিতীয় প্রশ্নের উত্তর
> "প্রত্যেকবার কিন্তু সার্ভার থেকে কল হবে নাকি?"

এখন — হ্যাঁ আংশিক ভাবে হচ্ছে কারণ preview iframe-এ Service Worker disabled (Lovable preview-এর সীমাবদ্ধতা)। কিন্তু **production-এ deploy করার পরে** PWA service worker সব আইকন প্রথমবার download করেই permanent cache-এ রাখবে — এরপরে সার্ভারে আর call হবে না (৯০ দিন পর্যন্ত)। উপরের cache rule strengthening সেটা নিশ্চিত করবে।