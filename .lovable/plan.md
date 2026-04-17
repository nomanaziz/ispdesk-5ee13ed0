

User চান sidebar/menu থেকে "Affiliation" group (Affiliate Partners ইত্যাদি) remove করতে। User বর্তমানে `/dashboard/affiliation/partners` route-এ আছেন।

আমি AppSidebar এবং App.tsx-এ affiliation related entries খুঁজে remove করব।

## Plan: Affiliation Module Removal

### Changes

1. **`src/components/AppSidebar.tsx`** — "Affiliation" menu group (Affiliate Partners, Add Affiliator) সম্পূর্ণ remove।
2. **`src/App.tsx`** — `/dashboard/affiliation/*` routes এবং related imports remove।
3. **Files delete**:
   - `src/pages/dashboard/affiliation/Partners.tsx`
   - `src/pages/dashboard/affiliation/AddAffiliator.tsx`
   - (folder খালি হলে folder-ও)

### Note
Database-এ affiliation related কোনো table নেই (placeholder pages মাত্র), তাই migration দরকার নেই।

