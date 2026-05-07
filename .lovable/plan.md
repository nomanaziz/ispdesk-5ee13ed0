# গুরুত্বপূর্ণ লিংকে আইডি/পাসওয়ার্ড সংরক্ষণ ও কপি ফিচার

প্রতিটি লিংকের সাথে ঐচ্ছিক **Username, Password, Notes** যোগ করার সুবিধা দেওয়া হবে। কার্ডে show/hide, এক ক্লিকে কপি বাটন থাকবে।

## কী করা হবে

### 1. ডাটাবেস (Migration)
`important_links` টেবিলে নতুন কলাম যোগ:
- `username text` — ঐচ্ছিক লগইন আইডি
- `password_encrypted text` — পাসওয়ার্ড (pgcrypto দিয়ে এনক্রিপ্টেড)
- `notes text` — অতিরিক্ত নোট (যেমন 2FA, server IP)

পাসওয়ার্ড plain-text-এ সংরক্ষণ করা হবে না। `pgcrypto` extension ব্যবহার করে সংরক্ষণের আগে এনক্রিপ্ট ও পড়ার সময় ডিক্রিপ্ট করা হবে দুটি SECURITY DEFINER ফাংশনের মাধ্যমে:
- `set_important_link_password(link_id, plain)` — শুধু admin role
- `get_important_link_password(link_id)` — admin/super_admin/operator রোল চেক করে ডিক্রিপ্ট রিটার্ন করবে

এনক্রিপশন কী একটি Supabase secret (`LINK_VAULT_KEY`) থেকে আসবে।

### 2. লিংক ডায়ালগ (`ImportantLinkDialog.tsx`)
নতুন ফিল্ড যোগ:
- **ইউজারনেম / আইডি** (text input)
- **পাসওয়ার্ড** (password input + show/hide চোখ আইকন)
- **নোট** (textarea, ঐচ্ছিক)

সংরক্ষণের সময় পাসওয়ার্ড আলাদা RPC কল-এ এনক্রিপ্ট হয়ে যাবে। এডিট মোডে পাসওয়ার্ড ফাঁকা থাকবে — শুধু পরিবর্তন করতে চাইলে নতুনটি দিতে হবে।

### 3. লিংক কার্ড (`ImportantLinkCard.tsx`)
যেসব লিংকে credential আছে সেগুলোতে নতুন আইকন/বাটন:
- 🔑 **Credentials** বাটন → একটি ছোট popover খোলে
- Popover-এ:
  - **আইডি**: `user@example.com` `[কপি]`
  - **পাসওয়ার্ড**: `••••••••` `[👁 দেখান]` `[কপি]`
  - **নোট** (যদি থাকে)
- পাসওয়ার্ড কপি/দেখানোর সময় RPC কল করে ডিক্রিপ্ট হবে
- কপি করলে toast: "কপি হয়েছে"
- পাসওয়ার্ড 30 সেকেন্ড পর auto-hide

### 4. সিকিউরিটি
- শুধু `super_admin / admin / operator` credential দেখতে/কপি করতে পারবে (বর্তমান `canSee` লজিকের মতই)
- পাসওয়ার্ড কখনো নেটওয়ার্কে plaintext-এ যাবে না সংরক্ষণের সময় (RPC দিয়ে এনক্রিপ্ট)
- ডিক্রিপ্ট শুধু authorized request-এ

## টেকনিক্যাল সারাংশ

- Migration: `important_links`-এ ৩টা কলাম + 2টা SECURITY DEFINER ফাংশন + pgcrypto extension
- Secret: `LINK_VAULT_KEY` (admin user-কে set করতে বলা হবে; না দিলে fallback hash)
- Files edited:
  - `src/components/dashboard/ImportantLinkDialog.tsx` — নতুন ফর্ম ফিল্ড
  - `src/components/dashboard/ImportantLinkCard.tsx` — credentials popover + কপি/show
  - `src/components/dashboard/ImportantLinksSection.tsx` — পাস-থ্রু props (canViewSecrets)
