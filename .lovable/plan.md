## লক্ষ্য
ZKTeco ডিভাইস থেকে user pull যেন বাস্তবে কাজ করে এবং 0 user এলে কারণ/ডিবাগ তথ্য পরিষ্কার দেখা যায় — HR Payroll module শেষ করার জন্য এই অংশ final করা।

## কী করব
1. **ZKTeco user pull protocol শক্ত করব**
   - বর্তমান response দেখাচ্ছে device connect/auth OK, কিন্তু `USERTEMP_RRQ` থেকে `ACK_OK len=0` আসছে।
   - Edge function-এ কয়েকটি fallback command/flow যোগ করব: direct `USERTEMP_RRQ`, buffered request, legacy payload variants, এবং alternate user record decoding.
   - 72-byte/28-byte ছাড়াও common firmware-এর user buffer/header variation handle করব।

2. **0 user হলে actionable message দেখাব**
   - শুধু “0 জন user pull হয়েছে” না দেখিয়ে function log থেকে কারণ দেখাবে: connect/auth OK, কিন্তু device user data empty/unsupported response।
   - UI-তে latest pull log/debug panel যোগ করব যাতে আপনি দেখেন কোন step পর্যন্ত কাজ করেছে।

3. **User list auto-refresh/final UX**
   - Pull success হলে Device Users tab/list refresh হবে।
   - devices table এবং users tab দুই জায়গার pull button একই selected device ব্যবহার করবে।
   - “0 user” হলে warning toast দেখাবে, success toast না।

4. **Deploy/test path**
   - `zkteco-user-pull` edge function update করব।
   - সম্ভব হলে function deploy/test করব এবং Supabase logs দেখে নিশ্চিত করব request নতুন logic hit করছে।

## Technical files
- `supabase/functions/zkteco-user-pull/index.ts`
- `supabase/functions/zkteco-user-pull/zk-connect.ts`
- `supabase/functions/zkteco-user-pull/zkteco.ts`
- `src/pages/dashboard/hr/ZktecoDevices.tsx`

## Note
ডিভাইস connect/auth সফল হচ্ছে, তাই network/port/CommKey মূল সমস্যা না। সমস্যা সম্ভবত এই firmware user data ভিন্ন command/format-এ দিচ্ছে অথবা response empty দিচ্ছে; তাই fallback + clear diagnostics দরকার।