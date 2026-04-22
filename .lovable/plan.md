

## আসল সমস্যা
আগের execution-এ Settings page গুলো বানানো হয়েছিল **Admin dashboard** (`/dashboard/system/*` + `AppSidebar.tsx`) এ। কিন্তু আপনি চেয়েছিলেন **POP admin / Reseller portal** (`/pop-admin/*` + `ResellerLayout.tsx`) এ। POP admin এর সম্পূর্ণ আলাদা portal/layout/permission system আছে — সেখানে সিস্টেম group এ এখন শুধু ৩টা placeholder item আছে: Company Settings, Period, Users।

ফলে credit খরচ হলেও POP admin login করে কিছুই দেখা যাচ্ছে না — কারণ কাজটা ভুল jায়গায় হয়েছিল।

## এই plan-এ যা হবে — POP admin portal এ সব settings যোগ

### ১) ResellerLayout sidebar "সিস্টেম" group rebuild
`src/components/ResellerLayout.tsx` এর system group reference image অনুযায়ী:
```
- সিস্টেম সেটআপ        → /pop-admin/system/setup
- বিল পিরিয়ড          → /pop-admin/system/bill-period
- পিরিয়ড সেটআপ         → /pop-admin/system/period
- কোম্পানি সেটআপ       → /pop-admin/settings (existing)
- ইনভয়েস সেটআপ        → /pop-admin/system/invoice
- ইমেইল সেটআপ          → /pop-admin/system/email
- পেমেন্ট গেটওয়ে       → /pop-admin/system/payment-gateways
- প্রসেসিং ফি           → /pop-admin/system/processing-fee
- অটোমেটিক প্রসেস       → /pop-admin/system/automatic-process
- অ্যাক্টিভিটি লগ        → /pop-admin/system/activity-log
```
> User Management সরানোই আছে — `Users` item বাদ পড়বে।

### ২) নতুন POP admin pages তৈরি
সব pages `src/pages/reseller/system/` এ — `ResellerLayout` wrapper সহ। প্রতিটা pop scope (branch_id) aware:

| File | কী করবে |
|---|---|
| `PopSetup.tsx` | Tabs: "Common Settings" + "Clients & Billing Settings" (১০ group toggle) |
| `PopBillPeriod.tsx` | Year toggle list (image-192 অনুযায়ী) |
| `PopPeriodSetup.tsx` | Billing period config (cycle/mode) |
| `PopInvoice.tsx` | Logo upload + invoice position toggle (image-194) |
| `PopEmail.tsx` | Mail/SMTP protocol radio + SMTP config (image-193) |
| `PopPaymentGateways.tsx` | Gateway list + on/off + key config |
| `PopProcessingFee.tsx` | PG-wise processing fee % |
| `PopAutomaticProcess.tsx` | Scheduler list (image-190) — edit dialog |
| `PopActivityLog.tsx` | POP-scoped activity log viewer |

বিদ্যমান `ResellerSettings` (Company Settings) অপরিবর্তিত থাকবে।

### ৩) Storage strategy (per-POP isolation)
- POP-specific settings একটা নতুন pattern-এ save হবে: `system_settings` table-এ key prefix `pop:{branch_id}:{setting_key}` (e.g. `pop:abc-123:client_billing_settings`)
- `useSystemSetting` hook এর সাথে নতুন `usePopSystemSetting(key)` hook তৈরি করব যেটা automatically branch_id prefix যোগ করবে
- `automatic_processes` table-এ ইতিমধ্যে `branch_id` column আছে — POP-specific row insert/update হবে; না থাকলে global default fallback
- Logo upload — existing `pop-logos` bucket reuse, path: `{branch_id}/invoice-logo.png`

### ৪) App.tsx routes যোগ
১০টা নতুন route, সবটা `PortalAuthProvider + ResellerProtectedRoute(require="system") + ResellerLayout` wrapper দিয়ে। পুরনো placeholder `"/pop-admin/system/period"` (PopPlaceholder) replace হবে real component দিয়ে।

### ৫) Permission keys update
`src/lib/popPermissions.ts` এর `system` group items list সিঙ্ক করব নতুন ১০ menu item-এর সাথে — যাতে সুপার admin permission UI-তে সঠিক list দেখায়।

### ৬) Admin portal এর Settings পরিবর্তন (নয়)
Admin (`/dashboard/system/*`) এ আগে যেগুলো বানানো হয়েছিল সেগুলো **থাকবে অপরিবর্তিত** — এতে design consistency / কাজ ভাঙবে না। শুধু POP portal-এ সমান্তরাল পেজ তৈরি করা হবে।

## কোন file বদলাবে / নতুন
**নতুন (9 files):**
- `src/pages/reseller/system/PopSetup.tsx`
- `src/pages/reseller/system/PopBillPeriod.tsx`
- `src/pages/reseller/system/PopPeriodSetup.tsx`
- `src/pages/reseller/system/PopInvoice.tsx`
- `src/pages/reseller/system/PopEmail.tsx`
- `src/pages/reseller/system/PopPaymentGateways.tsx`
- `src/pages/reseller/system/PopProcessingFee.tsx`
- `src/pages/reseller/system/PopAutomaticProcess.tsx`
- `src/pages/reseller/system/PopActivityLog.tsx`
- `src/hooks/usePopSystemSetting.ts`

**Edit:**
- `src/components/ResellerLayout.tsx` (system group rebuild)
- `src/lib/popPermissions.ts` (system items list sync)
- `src/App.tsx` (10 new routes)

## কোন file বদলাবে না
- Admin dashboard pages, RLS policies, edge functions, billing logic, MikroTik integration, existing `/pop-admin/settings` (Company)

## Apply-এর পরে expected ফলাফল
1. POP admin login → "সিস্টেম" group এ ১০টা item দেখাবে
2. প্রতিটা page reference image অনুযায়ী functional হবে — toggle/save সরাসরি POP-scoped storage-এ persist
3. একটা POP-এর setting অন্য POP-এ leak করবে না (branch_id isolation)
4. Admin dashboard এর settings অপরিবর্তিত — break হবে না
5. Credit খরচ হবে শুধু এই POP portal কাজের জন্য, কোনো মিশ্রণ হবে না

