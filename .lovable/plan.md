

## লক্ষ্য
Admin যেকোনো জায়গা থেকে (POP/Reseller, ISP Client, BW Sale Customer) **"Login as"** চাপলে এক click-এ ওই account-এ portal/reseller dashboard-এ auto-login হবে — password ছাড়াই, নতুন tab-এ।

## Architecture

```text
Admin clicks "Login as" → impersonate-portal-user edge function
                           (verifies admin role, fetches user, issues portal token)
                              ↓
                          returns { token, customer, redirect_url }
                              ↓
              window.open(redirect_url + #imp=<token>) → new tab
                              ↓
         PortalAuthContext / AuthLanding picks up `#imp=` from URL hash,
         stores token in localStorage, navigates to correct dashboard
```

এক unified flow — প্রত্যেক user-type-এর জন্য আলাদা logic নেই।

## পরিবর্তন

### 1. New edge function: `supabase/functions/impersonate-portal-user/index.ts`
- Input: `{ user_type: "client" | "reseller" | "reseller_sub" | "bw_customer", user_id: uuid }`
- Auth: caller-এর JWT verify → `is_admin_or_super(auth.uid())` check, না হলে 403
- User-type অনুযায়ী respective table থেকে row fetch (clients / branch_managers / bw_reseller_users / bw_sale_customers)
- `portal-auth`-এর মতো same `issueToken` helper দিয়ে token issue (24h exp)
- `portal_login_log`-এ insert with `note: "admin_impersonation by <admin_email>"` (audit trail)
- Return: `{ token, customer, redirect: "/portal/dashboard" বা "/pop-admin/dashboard" }`
- `verify_jwt = true` (default) — Supabase auth JWT validation দরকার

### 2. New helper: `src/lib/impersonate.ts`
```ts
export async function loginAsUser(user_type, user_id) {
  const { data, error } = await supabase.functions.invoke("impersonate-portal-user", {
    body: { user_type, user_id }
  });
  if (error || data?.error) throw new Error(...);
  // open new tab with token in hash (one-shot pickup)
  const url = `${window.location.origin}${data.redirect}#imp=${encodeURIComponent(data.token)}`;
  window.open(url, "_blank", "noopener");
}
```

### 3. `PortalAuthContext.tsx` — pick up `#imp=` token on mount
useEffect-এর শুরুতে check:
```ts
const hash = window.location.hash;
if (hash.startsWith("#imp=")) {
  const token = decodeURIComponent(hash.slice(5));
  const decoded = JSON.parse(atob(token));
  if (decoded.exp > Date.now()) {
    localStorage.setItem("portal_token", token);
    window.history.replaceState(null, "", window.location.pathname); // clean URL
    setCustomer(decoded); setToken(token); setLoading(false);
    return;
  }
}
// existing localStorage flow...
```

### 4. UI wiring — "Login as" buttons (admin-only, hidden for non-admin)
সবগুলোতে `useAuth().isAdmin` দিয়ে gate, আর `loginAsUser(...)` call:

| File | Change |
|---|---|
| `src/pages/dashboard/branches/Managers.tsx` | `handleLoginAs` → `loginAsUser("reseller", m.id)` |
| `src/pages/dashboard/branches/PopProfile.tsx` (line 216) | "Coming soon" → real call |
| `src/components/client-actions/ClientActionButtons.tsx` | নতুন menu item "Admin: Login as Client" (isAdmin হলে) → `loginAsUser("client", client.id)` |
| `src/pages/dashboard/billing/ClientProfile.tsx` | Quick Actions-এ "Login as Client" button যোগ (admin-only) |
| `src/pages/dashboard/bw-sale/Pop.tsx` (line 246-250) | Action column-এ LogIn icon button (admin-only) → `loginAsUser("bw_customer", c.id)` |
| `src/pages/dashboard/bw-sale/CustomerView.tsx` | Header-এ "Login as Customer" button যোগ (admin-only) |
| `src/pages/reseller/ResellerUsers.tsx` | Sub-user row-এ "Login as" icon (admin-only) → `loginAsUser("reseller_sub", u.id)` |

প্রত্যেক জায়গায় same one-liner:
```tsx
{isAdmin && <Button onClick={() => loginAsUser("...", id).catch(e => toast.error(e.message))}>
  <LogIn /> Login as
</Button>}
```

## Security

- Edge function-এ admin role check বাধ্যতামূলক (non-admin call → 403)
- Token-এ `impersonated_by: admin_user_id` claim যোগ — future audit-এ কে কাকে impersonate করল track করা যাবে
- `portal_login_log`-এ `user_agent` field-এ `[IMPERSONATED]` prefix
- New tab-এ open হবে — admin session intact থাকবে main tab-এ

## যা **বদলাবে না**
- `portal-auth` edge function — intact (regular login flow)
- `PortalAuthContext` login/logout flow — intact, শুধু `#imp=` pickup যোগ হচ্ছে
- DB schema, RLS, কোনো migration — কিছু লাগবে না (existing tables ব্যবহার)
- Regular user login UX — কোনো change নেই

## Files Created/Modified
- **New**: `supabase/functions/impersonate-portal-user/index.ts`, `src/lib/impersonate.ts`
- **Modified**: `src/contexts/PortalAuthContext.tsx`, `src/pages/dashboard/branches/Managers.tsx`, `src/pages/dashboard/branches/PopProfile.tsx`, `src/components/client-actions/ClientActionButtons.tsx`, `src/pages/dashboard/billing/ClientProfile.tsx`, `src/pages/dashboard/bw-sale/Pop.tsx`, `src/pages/dashboard/bw-sale/CustomerView.tsx`, `src/pages/reseller/ResellerUsers.tsx`

approve করলে এই 8 file-এ change apply করব এবং নতুন 2 file create করব।

