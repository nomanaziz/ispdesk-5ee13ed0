

## লক্ষ্য
গ্রাহক পোর্টালের **My Profile** page-কে reference image-এর মতো clean **tabbed interface**-এ রূপান্তর করা, এবং logout button duplication সরিয়ে design consistency আনা।

---

## সমস্যা (এখন কী আছে)
1. **দুই জায়গায় Logout** — sidebar-এর Account section-এ + top-bar dropdown-এ। Duplicate, confusing।
2. **Profile page অগোছালো** — সব field (contact, address, name, NID, photo, nid front/back) একসাথে long form। Reference image-এ tab দিয়ে ভাগ করা।
3. **Design inconsistency** — Public website (bn/en toggle, layout) এর সাথে portal-এর look আলাদা মনে হচ্ছে।

---

## সমাধান

### 1. Logout duplication দূর করা
**File: `src/components/PortalLayout.tsx`**
- Sidebar-এর "Account" section এবং "Logout" button **সরিয়ে দেব**।
- শুধু **top-bar avatar dropdown**-এ logout থাকবে (reference image-এর মতো)।
- Dropdown-এ আরও add হবে: profile name + running package (small caption) + "My Profile" link + "Change Password" link + Logout (red)।

### 2. Profile page-কে tabbed করা
**File: `src/pages/portal/PortalProfile.tsx`** — পুরো restructure (existing logic preserve)

**Layout (reference image অনুযায়ী):**
- **Header card**: paper icon + "Profile" + helper text।
- **Two-column grid (lg)**:
  - **Left (1/3)**: Avatar card with gradient header → name → Client Code, Login ID, User ID/IP, Status, Registration Date। নিচে "Discontinue Request" button (existing change-request flow-এ নিয়ে যাবে)।
  - **Right (2/3)**: Tab interface

**Tabs (5টা):**
| Tab | Content |
|---|---|
| **Personal Information** | Name, Phone, Email, DOB, Occupation, Father/Mother name, District, Upazila, NID, Gender, Road, House, Present/Permanent address → "Update Personal Info" green button (existing `update_profile` + `submit_doc_update` mix) |
| **Change Password** | Current password, New password, Confirm — needs new edge function action `change_password` |
| **Update Profile Picture** | Single photo uploader (existing logic) — submits to admin approval |
| **Change Mobile Number** | New number input + reason → `submit_doc_update` (admin approval) |
| **Status Request History** | Existing requests table (already in current page) |

### 3. Design consistency with public website
- Public website-এর header pattern (compact, clean) follow করব।
- Portal top-bar-এ একই language toggle style (already আছে — শুধু polish)।
- Sidebar item spacing/typography public site-এর মতো রাখব (already close)।
- Color palette unchanged — existing colorful tints (per memory)।

### 4. Backend — নতুন action
**File: `supabase/functions/portal-data/index.ts`**
- `change_password` action: payload `{current, new}` → bcrypt verify → bcrypt hash → update `clients.portal_password` (or wherever stored)। Existing portal-auth pattern follow।

---

## Technical Details

### Files modified
1. `src/components/PortalLayout.tsx` — sidebar logout সরানো, top dropdown enrich
2. `src/pages/portal/PortalProfile.tsx` — full restructure to tabbed layout (Tabs primitive আছে)
3. `supabase/functions/portal-data/index.ts` — `change_password` action যোগ

### Reused
- Existing `update_profile` action (instant fields)
- Existing `submit_doc_update` action (admin-approval fields)
- Existing `upload_document` action (file uploads)
- `change_requests` table-এর existing history query

### Validation
- Password: min 6 char, new ≠ current, confirm match
- Mobile: 11-digit BD format
- Existing field rules unchanged

---

## Out of scope
- Public website redesign
- New languages
- Profile activity log (last login etc. stays as small card on left)
- 2FA / OTP

---

## Apply-এর পরে expected
1. শুধু একটাই logout — top-right dropdown-এ। Sidebar পরিচ্ছন্ন।
2. My Profile page tabbed — Personal Info / Change Password / Update Picture / Change Mobile / Request History।
3. Left side compact info card (avatar + client meta + Discontinue button)।
4. Top dropdown-এ name + package + quick links — reference image-এর mini-panel concept।

