
User wants: front page (public site) navbar এ যখন কোনো user logged in থাকে, তখন "Dashboard" button-এর জায়গায় user-এর short name দেখাবে, আর সেই name-এর নিচে dropdown-এ logout option থাকবে।

দুই ধরনের user আছে:
1. **Admin/Staff** (`useAuth` থেকে) — currently "ড্যাশবোর্ড" button দেখায়
2. **Portal customer** (`usePortalAuth` থেকে) — currently কিছুই দেখায় না navbar-এ

দুটো case-ই handle করতে হবে।

## পরিবর্তন

**File: `src/components/public/PublicNavbar.tsx`**

- `useAuth` (admin) ও `usePortalAuth` (client) — দুটো context check করব
- Logged-in হলে: avatar + short name (first name বা username-এর প্রথম শব্দ) দেখাব
- DropdownMenu-তে:
  - Admin হলে → "ড্যাশবোর্ড" link + "লগআউট"
  - Portal customer হলে → "আমার পোর্টাল" link + "লগআউট"
- Logged-out হলে: শুধু একটা "লগইন" button (icon সহ)
- Mobile menu-তেও same behavior

Short name logic:
- Admin: `user.user_metadata.full_name`-এর প্রথম শব্দ, fallback email-এর `@` আগের অংশ
- Customer: `customer.name`-এর প্রথম শব্দ, fallback `customer.username`
- Max ~12 chars truncate

Logout:
- Admin → `signOut()` then redirect `/`
- Customer → `usePortalAuth().logout()` then redirect `/`

কোনো DB change লাগবে না, শুধু একটা file edit।
