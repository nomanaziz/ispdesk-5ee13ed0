

## লক্ষ্য

ছোট স্ক্রিনে Client List ও Billing List-এ horizontal scroll এড়ানোর জন্য action button গুলো একটা **3-dot menu (More)**-এর ভিতরে ঢুকিয়ে দেব। বড় স্ক্রিনে আগের মতোই inline icon row থাকবে।

## সমাধান

### `src/components/client-actions/ClientActionButtons.tsx` (একটাই ফাইল edit)

Tailwind responsive utility দিয়ে dual rendering:

- **`hidden md:flex`** — বড় স্ক্রিনে (≥768px) বর্তমান 6টা icon button row যেমন আছে তেমনই থাকবে (Delete, Status, Package, SMS, Edit, View)
- **`md:hidden`** — ছোট স্ক্রিনে শুধু একটা **3-dot button** (`MoreVertical` icon) দেখাবে। Click করলে DropdownMenu খুলবে যেখানে সব action serial-ভাবে label সহ থাকবে:
  - 👁 ভিউ
  - ✏️ এডিট
  - 💬 SMS পাঠান
  - 📦 প্যাকেজ শিডিউলার
  - 📅 স্ট্যাটাস শিডিউলার
  - 🗑 ডিলিট (red)

### Component ব্যবহার

`shadcn/ui`-এর `DropdownMenu` (`DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`) — already available in `src/components/ui/dropdown-menu.tsx`।

Delete-এর জন্য `AlertDialog` confirm flow `DropdownMenuItem`-এর `onSelect` থেকে controlled state দিয়ে trigger করব (যাতে dropdown বন্ধ হওয়ার পরও confirm dialog ঠিকমতো খোলে)। Status ও Package scheduler dialog একই pattern-এ।

### Breakpoint যুক্তি

- `md` = 768px (Tailwind default) — laptop/desktop
- এর নিচে (mobile/small tablet) = 3-dot menu

## Files

**Edit:**
- `src/components/client-actions/ClientActionButtons.tsx` — dual layout (inline + dropdown)

ClientList.tsx ও BillingList.tsx-এ পরিবর্তন লাগবে না — তারা `<ClientActionButtons />` ব্যবহার করে, একই component তাই সব জায়গায় অটো কাজ করবে।

## ফলাফল

- Mobile/small screen: একটা পরিষ্কার 3-dot icon → tap → vertical menu → action select
- Desktop: আগের মতোই 6টা icon side-by-side, কোনো পরিবর্তন নেই

