## লক্ষ্য
- সব employee request (ছুটি, advance, resignation, requisition, profile-change, খাবার order) এক জায়গায় super admin দেখবে
- AdminNotificationBell-এ সব HR event আসবে
- নতুন **HR** app role তৈরি করা হবে যাতে HR personnel শুধু HR module access পায়

---

## ১. Unified Employee Request Hub (নতুন page)

**Route:** `/dashboard/hr/employee-hub` (sidebar-এ যোগ হবে: "কর্মী আবেদন কেন্দ্র")

এক page-এ tab বা stacked card layout — প্রতিটি tab থেকে directly approve/reject ও deep-link দুটোই থাকবে:

| Tab | উৎস table | বর্তমান review page (deep link) |
|---|---|---|
| ছুটি | `leave_applications` (status=pending) | `/dashboard/hr/leave` |
| অগ্রিম বেতন | `salary_advance_requests` | `/dashboard/hr/advance-salary` ও inline |
| পদত্যাগ | `resignation_requests` | `/dashboard/hr/resignations` ও inline |
| রিকুইজিশন | `requisitions` (request_type=employee) | inline (existing `EmployeeRequests.tsx` logic reused) |
| প্রোফাইল পরিবর্তন | `profile_change_requests` | `/dashboard/hr/profile-approvals` |
| খাবার order (আজ) | `meal_orders` (today) | inline count + list |
| কনভেয়েন্স | `conveyance_bills` (pending) | `/dashboard/hr/conveyance-bills` |

প্রতিটি item-এ employee নাম, তারিখ, summary, status badge, ✓/✗ button থাকবে। উপরে summary chips: "৫ ছুটি · ২ advance · ১ resignation …"

বর্তমানে scattered `EmployeeRequests.tsx`, `ProfileApprovals.tsx` সাব-কম্পোনেন্ট হিসেবে reuse হবে — কোড duplication হবে না।

---

## ২. AdminNotificationBell-এ HR events যোগ

`src/components/notifications/AdminNotificationBell.tsx`-এ ৫টা নতুন kind যোগ:
- `leave` — pending `leave_applications`
- `advance` — pending `salary_advance_requests`
- `resignation` — pending `resignation_requests`
- `requisition` — pending `requisitions` (employee type)
- `profile_change` — pending `profile_change_requests`

প্রতিটি item-এর click → unified hub-এর সংশ্লিষ্ট tab-এ নিয়ে যাবে। Realtime channel subscribe হবে এই ৫ table-এ।

**খাবার order notification noise হবে** (প্রতিদিন বহু order) — তাই bell-এ আলাদা item নয়, শুধু hub-এ আজকের count দেখানো হবে।

---

## ৩. HR app role (migration)

```sql
INSERT INTO public.app_roles (id, name, status, is_protected, is_default)
VALUES (gen_random_uuid(), 'HR', 'active', true, false)
ON CONFLICT (name) DO NOTHING;
```

এবং `app_role_modules`-এ HR role-এর জন্য পূর্ব-নির্ধারিত access:
- সব `/dashboard/hr/*` pages (full access)
- `/dashboard/hr/employee-hub` (full)
- বাকি modules — no access

(Module key গুলো existing `app_role_modules` pattern থেকে নেওয়া হবে।)

---

## ৪. Sidebar update

`AppSidebar.tsx` HR group-এর শুরুতে যোগ:
```
{ title: "কর্মী আবেদন কেন্দ্র", url: "/dashboard/hr/employee-hub", badge: <count> }
```

`useSidebarBadges` hook update হবে যাতে pending count badge দেখায়।

---

## যা change হবে না
- Existing review pages (`LeaveManagement`, `AdvanceSalary`, `Resignations`, `ProfileApprovals`) অপরিবর্তিত থাকবে — শুধু new hub থেকে link করা হবে
- payroll/payslip/attendance logic unchanged
- `requisition_no` auto-generate trigger আগের session-এ যোগ হয়ে গেছে

---

## প্রশ্ন (যদি confirm দরকার হয়)
- "HR" role-এর জন্য `advance-salary` / `loans` / `resignations` approve করার ক্ষমতা থাকবে, নাকি শুধু view? — Default: full HR access ধরে নিচ্ছি।
- পুরোনো dual-table (`advance_salary` vs `salary_advance_requests`) cleanup এখন scope-এ রাখব না — শুধু documentation note থাকবে।