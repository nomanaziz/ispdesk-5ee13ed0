## Default কানেকশন টাইপ → "Optical Fiber"

### কী পরিবর্তন হবে
নতুন ক্লায়েন্ট যোগ করার ফর্মে (`/dashboard/clients/add`) **কানেকশন টাইপ \*** ফিল্ডটি এখন খালি থাকে ("নির্বাচন করুন" placeholder)। এটি **default-এ "Optical Fiber" সিলেক্ট করা থাকবে** — যদি `connection_types_config` টেবিলে এই নামে কোনো active entry থাকে।

### কীভাবে কাজ করবে
- `src/pages/dashboard/clients/AddClient.tsx`-এর form state initializer-এ `connection_type: ""` → `connection_type: "Optical Fiber"` করা হবে।
- একটি ছোট `useEffect` যোগ হবে যা `connectionTypes` লোড হওয়ার পর check করবে — যদি list-এ "Optical Fiber" না থাকে, তখন value clear হয়ে যাবে যাতে invalid value submit না হয় (safety fallback)।
- Prefill flow (নতুন রিকোয়েস্ট থেকে আসা ক্লায়েন্ট) যেখানে আগে থেকেই `connection_type` থাকে — সেটি override হবে না।

### Files
- `src/pages/dashboard/clients/AddClient.tsx` — শুধু একটি ফিল্ড default + safety effect

কোনো DB change, কোনো নতুন file দরকার নেই। POP-admin AddClient (`PopAddClient.tsx`) এই same component reuse করে — তাই সেখানেও automatically apply হবে।

### Note
যদি admin চান অন্য কোনো default (যেমন "Fiber" বা "Wireless") — সেটা `connection_types_config` page-এ গিয়ে নাম মিলিয়ে নিতে হবে, অথবা জানালে আমি default value পরিবর্তন করে দেবো।
