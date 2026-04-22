

## Install as App — সবার জন্য (PWA)

### লক্ষ্য
পুরো ISP ERP application-কে **installable web app (PWA)** বানাবো — যাতে Admin, POP Admin, Reseller, Client (Customer Portal) যে কেউ phone বা desktop-এ home screen-এ icon হিসেবে install করতে পারে। Install করার পর native app-এর মত standalone window-এ চলবে (browser address bar/tabs থাকবে না)।

### সমস্যা — কেন এখন কাজ করছে না
- Project-এ এখন কোনো `manifest.json`, PWA icon, বা service worker নেই
- Browser তাই "Install app" prompt show করে না
- Mobile-এ "Add to Home Screen" করলেও browser tab-এর মত খুলবে, app-এর মত না

---

### সমাধান (৩টা layer)

#### Layer 1 — Web App Manifest (installable ৯০% কাজ)
`public/manifest.json` তৈরি — এতে icon, theme color, display mode থাকবে।

```json
{
  "name": "ISP Desk — ERP & Customer Portal",
  "short_name": "ISP Desk",
  "description": "ISP business management system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#3B82F6",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`index.html`-এ link tags + iOS support meta:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3B82F6" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="ISP Desk" />
```

#### Layer 2 — App Icons তৈরি
Existing favicon থেকে generate করব (অথবা placeholder gradient icon — user পরে নিজের লোগো দিতে পারবে):
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/icon-maskable-512.png` (512×512, padded for Android adaptive icons)
- `public/icons/apple-touch-icon.png` (180×180)

Build script `/tmp/gen-icons.mjs` দিয়ে SVG → PNG generate করব (sharp library) — gradient + "ID" text।

#### Layer 3 — "Install Now" Button Component
নতুন reusable component: `src/components/InstallAppButton.tsx`
- `beforeinstallprompt` event capture (Chrome/Edge/Android)
- iOS Safari detect → modal-এ instruction দেখাবে: "Share → Add to Home Screen"
- ইতিমধ্যে installed হলে button hide
- Already-dismissed হলে localStorage-এ remember + 7 দিন পর আবার show

UI:
```
┌─────────────────────────────────────┐
│ 📱 অ্যাপ হিসেবে ইনস্টল করুন        │
│ ফোন/ডেস্কটপে আইকন যোগ করুন         │
│              [ Install Now ]        │
└─────────────────────────────────────┘
```

#### Where the button appears (সব portal-এ)
| Portal | Location |
|---|---|
| **Admin** (`TopBar.tsx`) | Header-এ ছোট icon button (download icon) |
| **POP Admin mobile** (`ResellerMobileShell.tsx`) | Sidebar drawer + dropdown menu item |
| **POP Admin desktop** (`ResellerLayout.tsx`) | Top header-এ icon |
| **Client portal** (`PortalLayout` / dashboard top) | Prominent banner (top of dashboard, dismissible) |
| **Public website** (`PublicLayout.tsx`) | Floating WiFi button-এর পাশে, "📲 Install App" floating chip |
| **Login pages** | Login form-এর নিচে subtle link |

#### Layer 4 — Service Worker — সাবধানে
PWA install prompt-এর জন্য service worker **mandatory** (Chrome requirement)। কিন্তু Lovable preview iframe-এ service worker সমস্যা করে — তাই:
- `vite-plugin-pwa` install করব
- `devOptions.enabled: false` (preview-তে SW off)
- `main.tsx`-এ guard: iframe / `id-preview--*` / `lovableproject.com` host হলে SW register **হবে না** + existing SW unregister
- শুধু production deploy (`ispdesk.lovable.app` + custom domain)-এ SW active
- `navigateFallbackDenylist`: `/~oauth`, `/api`, supabase function paths exclude

Caching strategy:
- HTML → NetworkFirst (always fresh)
- JS/CSS → CacheFirst (versioned hash)
- API calls → NetworkOnly (real-time data)

---

### User experience flow

**Android Chrome / Desktop Chrome/Edge**:
1. User visits site → service worker register (production only)
2. কয়েক সেকেন্ড পর `beforeinstallprompt` fire
3. Header / banner-এ "Install Now" button appear
4. Click → native install dialog → home screen-এ icon

**iOS Safari** (no native prompt support):
1. "Install Now" click → modal খুলবে
2. Animated guide: Share button → "Add to Home Screen" → Add
3. Screenshot/illustration সহ Bangla + English instruction

**Already installed**:
- `display-mode: standalone` detect → button hide
- `appinstalled` event → toast: "✅ Installed successfully"

---

### Files to create
- `public/manifest.json`
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- `src/components/InstallAppButton.tsx` — main button + modal
- `src/components/InstallAppBanner.tsx` — dismissible banner variant
- `src/hooks/useInstallPrompt.ts` — install logic hook

### Files to edit
- `index.html` — manifest link, theme-color, apple meta tags
- `vite.config.ts` — `vite-plugin-pwa` setup (production-only SW)
- `src/main.tsx` — iframe/preview SW guard
- `src/components/TopBar.tsx` — install icon button
- `src/components/reseller/mobile/ResellerMobileShell.tsx` — install option in dropdown
- `src/components/ResellerLayout.tsx` — install button in header
- `src/components/PublicLayout.tsx` — floating install chip
- Customer portal layout — install banner

### Dependencies
- `vite-plugin-pwa` (dev)
- Icons generated via existing `sharp` (no extra dep)

### Constraints respected
- Preview iframe-এ SW register হবে না (Lovable rule)
- ThemeProvider rule অপরিবর্তিত (App.tsx-এ থাকবে)
- Multi-tenant subdomain routing-এ effect নেই (manifest universal)

### ফলাফল
- যেকোনো user (Admin/POP/Reseller/Client) phone বা desktop-এ এক click-এ app install করতে পারবে
- Install-এর পর native app-এর মত icon, splash screen, standalone window
- Browser tab/address bar invisible — full app experience
- Offline static assets cache (page navigation কাজ করবে network ছাড়াও)
- iOS-এও step-by-step guide-এর মাধ্যমে install possible

