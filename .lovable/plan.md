## Sidebar Menu Rearrangement (Dashboard → AppSidebar)

Reorder `menuGroups` array in `src/components/AppSidebar.tsx` to a daily-use priority order. No item is removed; only the group order changes. "কনফিগারেশন" group is moved next to "সিস্টেম" (under System block), "ওয়েবসাইট প্যানেল" and "VAS" move to the bottom.

### New group order (top → bottom)

**Top priority (daily use)**
1. ড্যাশবোর্ড (Dashboard)
2. All Clients
3. POP / MAC ক্লায়েন্ট
4. ব্যান্ডউইথ ক্লায়েন্ট
5. সাপোর্ট ও টিকেটিং
6. অ্যাকাউন্টিং

**Operations**
7. HR ও পেরোল
8. OLT ম্যানেজমেন্ট
9. নেটওয়ার্ক মনিটরিং
10. নেটওয়ার্ক ডায়াগ্রাম
11. ডিভাইস
12. টাস্ক ম্যানেজমেন্ট
13. ব্যান্ডউইথ ক্রয়

**Reporting & Commerce**
14. রিপোর্ট
15. SMS সার্ভিস
16. ই-কমার্স
17. ক্রয়
18. বিক্রয় ও সার্ভিস
19. ইনভেন্টরি
20. অ্যাসেট
21. ইভেন্ট ও ছুটি

**Configuration & System (bottom block)**
22. ওয়েবসাইট প্যানেল
23. কনফিগারেশন
24. সিস্টেম
25. VAS (একদম নিচে)

### Technical notes

- Only the order of the `menuGroups` array literal in `AppSidebar.tsx` (lines ~69–end of array) is changed.
- No route changes, no permission key changes, no label/icon changes.
- `defaultOpen: true` stays on Dashboard so it auto-expands on load.
- POP-admin sidebar (`ResellerLayout`) and `popPermissions.ts` are untouched (different surface).
- Mobile bottom-nav untouched.

### Verification

- Visual check on `/dashboard` — top groups should be Dashboard → All Clients → POP/MAC → Bandwidth → Support → Accounting.
- Active-route highlight still works (uses URL, not order).
- Permission gating still works (uses group label keys, unchanged).