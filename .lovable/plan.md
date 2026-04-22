

## লক্ষ্য
My Profile page-এর critical bug fix + proper validation + Bangladesh country-code + package/join date display ঠিক করা।

---

## সমস্যাগুলোর কারণ (root cause)

### 🔴 Bug #1 — "এক letter লিখলেই input খালি হয়ে যায়"
`PortalProfile.tsx`-এ `F`, `Row`, `SectionTitle` component-গুলো **parent component-এর ভেতরে define করা**। প্রতি keystroke-এ React নতুন component reference বানায় → পুরো input unmount + remount → focus + value lost → মনে হয় "tab change হয়ে গেছে"।

### 🔴 Bug #2 — "Package, Joining Date দেখাচ্ছে না"
Backend-এর `get_profile` action শুধু minimal field return করে — `joining_date`, `package_id`, `father_name`, `mother_name`, `date_of_birth`, `occupation`, `gender`, `phone_number`, `road_number`, `house_number` **return-ই হচ্ছে না**। তাই left card-এ "—" + Personal tab-এ সবকিছু blank।

### 🔴 Bug #3 — Validation নেই
Name-এ digit allow হচ্ছে, mobile-এ letter allow হচ্ছে, country code নেই।

---

## সমাধান

### 1. Component re-mount bug fix
**File: `src/pages/portal/PortalProfile.tsx`**
- `F`, `Row`, `SectionTitle` — তিনটাই **module-level**-এ সরানো (parent function-এর বাইরে)।
- Or even simpler: inline `<Input>` direct ব্যবহার, helper component বাদ।
- Result: typing smooth, focus lost হবে না।

### 2. Backend `get_profile` enrich
**File: `supabase/functions/portal-data/index.ts`** — `get_profile`-এর select clause-এ সব profile field যোগ + package join:
```ts
.select("id, name, client_id, username, contact, email, address, present_address, permanent_address, nid_number, photo_url, nid_front_url, nid_back_url, documents, joining_date, expire_date, billing_date, status, package_id, father_name, mother_name, date_of_birth, occupation, gender, road_number, house_number, phone_number")
```
+ এর পর `loadClient`-এর মতো `isp_packages` join করে `package: {name, bandwidth_down, price}` return।

### 3. Validation যোগ
**File: `src/pages/portal/PortalProfile.tsx`** — ৩ ধরনের sanitizer onChange-এ:

| Field | Rule | Behavior |
|---|---|---|
| **Name** (father, mother) | শুধু alphabet + space | digit/symbol টাইপ করলে auto-strip |
| **Mobile / Alternate Phone** | শুধু digit, max 11 | letter টাইপ করলে accept-ই হবে না; submit-এ regex check `/^01[3-9]\d{8}$/` |
| **Email** | trim + lowercase | submit-এ HTML5 + zod email check |
| **Occupation** | letters + space + ., | digit reject |

`onChange={(e) => setForm({...form, contact: e.target.value.replace(/\D/g, '').slice(0,11)})}`

### 4. Country code prefix (Bangladesh +880 default)
Mobile + Alternate Phone field দুটোয় **prefix add-on** UI:
- বাঁদিকে disabled flag chip: `🇧🇩 +880`
- Input শুধু 11-digit local number নেয় (01XXXXXXXXX)
- Display only — backend/DB-তে existing format-ই (01...) save হবে, কারণ Bangladesh default

Compact pattern:
```tsx
<div className="flex">
  <div className="flex items-center gap-1 px-2 border border-r-0 rounded-l bg-muted text-xs">
    🇧🇩 +880
  </div>
  <Input className="rounded-l-none" maxLength={11} ... />
</div>
```

### 5. Mobile Tab-এও same prefix + validation
**File: `src/pages/portal/PortalProfile.tsx` → `MobileTab`** — same flag prefix pattern + digit-only sanitizer।

### 6. Personal tab-এর field re-population fix
যেহেতু `get_profile` enrich হবে, `useEffect` dependency `[client?.id]` রেখে — load হলে সব field properly populate হবে। শুধু confirm করব form fields সব properly bind।

---

## Files modified

| File | Change |
|---|---|
| `src/pages/portal/PortalProfile.tsx` | Helper components module-level সরানো · digit/alpha sanitizers · 🇧🇩 +880 prefix · validation on submit |
| `supabase/functions/portal-data/index.ts` | `get_profile` action enrich (all personal fields + package join) |

---

## Out of scope
- International phone number support (শুধু Bangladesh)
- Phone uniqueness check across clients
- Email verification flow
- Other portal pages-এর form (শুধু Profile)

---

## Apply-এর পরে expected
1. ✅ Personal tab-এ smooth typing — কোনো field auto-clear/jump হবে না
2. ✅ Left card-এ Package name + Joined date দেখাবে
3. ✅ Personal tab open করলেই সব existing data pre-filled থাকবে (DOB, father, mother, occupation, gender, address)
4. ✅ Mobile field-এ 🇧🇩 +880 prefix + শুধু digit accept (max 11)
5. ✅ Name field-এ digit টাইপ করলে auto-strip
6. ✅ Save করলে valid data backend-এ যাবে — invalid হলে toast error

