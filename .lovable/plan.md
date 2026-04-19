

## পরিবর্তন
Sidebar থেকে আলাদা "Billing" group সরিয়ে এর ৪টি item (Billing List, Daily Collection, Billing Cycle, Installation Fee) "Home Client" group-এর ভেতরে Client List-এর পরে যোগ করা।

## File
`src/components/AppSidebar.tsx` — শুধু এই একটি file edit হবে।

## কাজ
1. "Home Client" (clients) group-এর items array খুঁজে বের করব — Client List item-টার পরে নিচের ৪টি যোগ করব ক্রম অনুযায়ী:
   - Billing List → `/dashboard/billing`
   - Daily Collection → `/dashboard/billing/daily-collection`
   - Billing Cycle → `/dashboard/billing/cycle-settings` (verify route)
   - Installation Fee → `/dashboard/sales/installation-fee`
2. আলাদা "Billing" top-level group সম্পূর্ণ remove করব।
3. Icon গুলো current Billing group থেকে নিয়ে আসব (Receipt, CalendarDays, Settings2, Wrench ইত্যাদি)।
4. Permission key (যদি থাকে) প্রতিটি item-এর সাথে preserve করব।

## Route যাচাই (পরিবর্তন আগে)
- `App.tsx`-এ চারটি route confirm করব যাতে link ভাঙে না।

## Notes
- POP billing ও Bandwidth billing আলাদা group-এ থাকবে — touch করব না।
- কোনো page/route delete হবে না, শুধু sidebar grouping পরিবর্তন।
- Order: Add Client → Client List → **Billing List → Daily Collection → Billing Cycle → Installation Fee** → বাকি Home Client items।

