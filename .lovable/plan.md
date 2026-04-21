

## লক্ষ্য
POP Manager list page থেকে "Unassigned Client" warning banner সম্পূর্ণ remove।

## পরিবর্তন (শুধু `src/pages/dashboard/branches/Managers.tsx`)

1. **Banner সরানো** — lines 149–161 (পুরো `{orphanCount > 0 && (...)}` block) মুছে দেব।
2. **Orphan counting logic সরানো** — `clientData` query থেকে `orphanCount` গণনার অংশ বাদ (lines 49, 52, 61)। Query শুধু `map` return করবে।
3. **Unused variable cleanup** — `orphanCount` destructure (line 65) সরিয়ে দেব।

## যা বদলাবে না
- POP list, stats card, filter, table — সব আগের মতই
- Client data বা branch_id NULL clients এর data — কিছুই touch হবে না
- অন্য কোনো page-এ Unassigned client view থাকলে সেটাও intact

approve করলে এই একটি ছোট change apply করব। তারপর আপনার নতুন sequence-এর জন্য অপেক্ষায় থাকব।

