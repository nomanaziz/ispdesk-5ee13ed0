

## Top Bar Clock — সব panel-এ live ঘড়ি

### লক্ষ্য
Admin, POP Admin, Reseller, Customer portal — সব panel-এর header-এ একটা live clock দেখাবে। Bangla locale-এ time + date।

### Design
```
12:34:56 PM
২৩ এপ্রিল, বুধবার
```
- বড় digit-এ time (HH:MM:SS, 12-hour with AM/PM)
- নিচে ছোট font-এ Bangla date + day name
- Auto-update প্রতি 1 second-এ
- Search bar আর Quick Add button-এর মাঝখানে header-এ বসবে
- Mobile-এ (sm-এর নিচে) শুধু time দেখাবে, date hide
- Lang-aware: Bangla হলে `bn-BD` locale, English হলে `en-US`

### Implementation

**নতুন file**: `src/components/HeaderClock.tsx`
- `useState` + `useEffect` with `setInterval(1000)`
- `Intl.DateTimeFormat` দিয়ে locale-aware formatting
- `useLanguage()` hook থেকে current lang নিবে
- Cleanup interval on unmount

**Edit করব** (header-এ mount):
- `src/components/TopBar.tsx` — Admin panel header
- `src/components/ResellerLayout.tsx` — POP Admin desktop header
- `src/components/reseller/mobile/ResellerMobileShell.tsx` — POP Admin mobile (compact variant)
- `src/components/PortalLayout.tsx` — Customer portal header

Component-এর দুটি variant থাকবে:
- `<HeaderClock />` — full (time + date)
- `<HeaderClock compact />` — শুধু time, mobile-এর জন্য

### Styling
- `font-mono` for time digits (alignment ভালো হবে)
- `text-sm font-semibold` time, `text-[10px] text-muted-foreground` date
- subtle border/background — header-এর rest-এর সাথে match
- Tabular numerals (`tabular-nums`) যাতে digits jitter না করে

### ফলাফল
- প্রতিটি panel-এর header-এ live ঘড়ি
- Bangla/English language toggle-এর সাথে auto switch
- Mobile responsive
- Performance impact zero (single 1s interval per mount)

