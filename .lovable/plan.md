# New Client Request ফর্ম — Mandatory ফিল্ড ও Default সেট

বর্তমান ফর্মটি ৪-ধাপের wizard যেখানে অনেক ঐচ্ছিক ফিল্ড আছে। আপনার চাহিদা অনুযায়ী এটিকে সরল, single-screen ফর্মে রূপান্তর করা হবে, শুধু প্রয়োজনীয় ফিল্ড এবং সঠিক default সহ।

## পরিবর্তনসমূহ (`src/pages/dashboard/clients/NewRequest.tsx`)

### ডায়ালগ ফর্মের ফিল্ড (multi-step বাদ → একটিই screen)

| ফিল্ড | আবশ্যক? | Default |
|---|---|---|
| কাস্টমারের নাম | ✅ আবশ্যক | — |
| মোবাইল নম্বর | ✅ আবশ্যক (01 দিয়ে শুরু, ১১ digit) | — |
| ঠিকানা | ঐচ্ছিক | — |
| কাস্টমার টাইপ | ✅ | **Home** |
| কানেকশন টাইপ | ✅ | **Optical Fiber** (config থেকে নাম মিলিয়ে auto-select; না পেলে প্রথমটি) |
| প্যাকেজ | ✅ | **৫০০ টাকা প্যাকেজ** (price=500 খুঁজে; না পেলে প্রথমটি) — select করলে monthly_bill auto-fill |
| OTC আছে? | চেকবক্স | **off** |
| OTC Amount | OTC checked হলেই দেখাবে ও আবশ্যক | — |
| শিডিউল তারিখ | ✅ | **আজকের তারিখ**; `min={today}` দিয়ে back-date ব্লক |

### Validation (`handleSubmit`)
- নাম খালি → "নাম আবশ্যক"
- মোবাইল regex `/^01\d{9}$/` না মিললে → "সঠিক মোবাইল নম্বর দিন"
- কাস্টমার টাইপ / কানেকশন টাইপ / প্যাকেজ / শিডিউল তারিখ খালি → error toast
- OTC checked কিন্তু amount ≤ 0 → error
- শিডিউল তারিখ < আজ → error

### Default-loading logic
- `defaultForm` থেকে initialize-এর পর `useEffect` দিয়ে যখন `packages` ও `connectionTypes` লোড হয় এবং ফর্ম খালি থাকে, তখন:
  - `customer_type` = `"Home"`
  - `connection_type_id` = `connectionTypes.find(c => /optical|fiber/i.test(c.name))?.id ?? connectionTypes[0]?.id`
  - `package_id` = `packages.find(p => Number(p.price)===500)?.id ?? packages[0]?.id`, এবং `monthly_bill` সেই প্যাকেজের price থেকে
  - `schedule_date` = `new Date().toISOString().slice(0,10)`

### UI পরিবর্তন
- `STEPS` array, step indicator, "পূর্ববর্তী/পরবর্তী" নেভিগেশন বাদ
- DialogContent-এ ২-column grid layout
- শিডিউল তারিখ `<Input type="date" min={todayISO}>` 
- OTC: `<Checkbox>` + ticked হলে নিচে `<Input type="number">`
- Submit button সরাসরি — "সেভ করুন"

### যেগুলো অপরিবর্তিত
- টেবিল, ফিল্টার, assign employee dialog, status/phy update, "Convert to Client" flow, সব mutation এবং DB কলাম একই থাকবে
- `gender / nid / father_name / email / zone / subzone / notes / billing_date` ফিল্ডগুলি ফর্ম থেকে সরিয়ে নেওয়া হবে (DB পেলোডে এগুলো null/default পাঠানো হবে যাতে existing schema break না হয়)

## প্রভাবিত ফাইল
- `src/pages/dashboard/clients/NewRequest.tsx` (একমাত্র)

Approve করলে আমি সরাসরি এই পরিবর্তনগুলো প্রয়োগ করব।
