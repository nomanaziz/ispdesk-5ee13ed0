## লক্ষ্য

TopBar-এ WordPress-style একটি "+" (Quick Create) button যোগ করা, যেখান থেকে এক ক্লিকে নতুন client, bill, invoice, ticket, task ইত্যাদি তৈরির shortcut পাওয়া যাবে।

## অবস্থান

`src/components/TopBar.tsx` — Online Monitoring icon-এর পাশে, Notifications-এর আগে। Desktop ও mobile উভয়েই দৃশ্যমান।

## UI ডিজাইন

- একটি বৃত্তাকার `+` icon button (Lucide `Plus`), primary tint সহ যাতে চোখে পড়ে।
- Click করলে `DropdownMenu` খুলবে — title "নতুন তৈরি করুন / Create new"।
- প্রতিটি item-এ ছোট icon + bilingual label। Group separator দিয়ে categorize করা।

## Shortcut তালিকা

Clients
- নতুন ক্লায়েন্ট → `/dashboard/clients/new-request`
- কুইক ক্লায়েন্ট (popup) → বিদ্যমান `QuickCreateClientDialog` খুলবে

Billing
- নতুন বিল / Invoice → `/dashboard/billing/invoices/new` (যে route বিদ্যমান, route registry থেকে confirm করে নেব)
- পেমেন্ট রিসিভ → `/dashboard/billing/payments/new`

Support & Tasks
- নতুন টিকিট → `/dashboard/support/tickets?new=1` (Tickets পেজ query param দেখে create dialog খুলবে — ছোট patch)
- নতুন টাস্ক → `/dashboard/hr/tasks?new=1` (একইভাবে)

Others (যদি route থাকে)
- নতুন প্যাকেজ → `/dashboard/billing/packages/new`
- নতুন কর্মী → `/dashboard/hr/employees/new`
- নতুন নোটিশ → `/dashboard/communication/notices/new`

(চূড়ান্ত করার আগে `App.tsx` route table পড়ে বিদ্যমান route গুলো verify করব; যেগুলো নেই, সেগুলো বাদ দেব।)

## আচরণ

- Permission-aware: যদি current user-এর কোনো module-এ create permission না থাকে, ওই item hide হবে (`usePermission` hook ব্যবহার করে)।
- Mobile-এ button থাকবে কিন্তু dropdown একই — touch-friendly width।
- Bilingual labels (`useLanguage().t`)।

## টেকনিক্যাল বিবরণ

- নতুন component: `src/components/QuickCreateMenu.tsx` — self-contained DropdownMenu trigger + items।
- TopBar-এ import করে Online Monitoring button-এর পরে বসানো হবে।
- Tickets ও Tasks পেজে minor patch: mount-এ `useSearchParams` থেকে `new=1` দেখলে create dialog auto-open।
- কোনো backend/schema change লাগবে না।

## Out of scope

- Permission system বা route structure পরিবর্তন।
- নতুন create form বানানো — শুধু বিদ্যমান page/dialog-এ navigate করা।
