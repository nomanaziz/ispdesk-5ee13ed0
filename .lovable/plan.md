

## Plan: Login System Cleanup — Remove Signup & Portal PPP Login

### Overview
1. Remove registration/signup from admin login page (Login.tsx)
2. Update portal-auth edge function to authenticate clients using **Client Code or PPP Username** + **PPP Password** from `clients` table (in addition to existing `bw_sale_customers`)
3. Update portal login UI labels accordingly

### Changes

**1. `src/pages/Login.tsx`**
- Remove all signup-related state (`fullName`, `isSignUp`)
- Remove the "Create Account" / "Don't have an account?" toggle
- Remove `signUp` import from `useAuth`
- Keep only email + password login form
- Clean up the UI to be login-only

**2. `src/contexts/AuthContext.tsx`**
- Remove `signUp` method from the context interface and provider (optional — can keep internally but not expose, or remove entirely)

**3. `supabase/functions/portal-auth/index.ts`**
- Update to first check `clients` table: match `username` field (PPP ID) OR `client_id` field (Client Code) against the submitted username
- Use `password` field from `clients` table for verification
- Check `status` field instead of `activity_status`
- If no match in `clients`, fall back to `bw_sale_customers` (for bandwidth/POP customers)
- Return appropriate token payload with client data

**4. `src/pages/portal/PortalLogin.tsx`**
- Update placeholder text: "PPP ID বা Client Code" for username field
- Update password placeholder: "PPP Password"
- Update labels to Bangla-friendly text

### Technical Details
- `clients` table has: `client_id` (unique code), `username` (PPP ID), `password` (PPP password), `name`, `status`
- Login matches on `username = input OR client_id = input`
- No database migration needed
- Edge function needs redeployment after changes
- 4 files edited

