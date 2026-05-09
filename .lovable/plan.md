## সমস্যা

`/dashboard/clients/add` পেজে তিনটি বাগ:

1. **Required validation দুর্বল** — শুধু `name` আর `client_id` চেক হয়, তাই mobile, NID, zone ইত্যাদি `*` দেওয়া field খালি রেখেই client active হয়ে যাচ্ছে।
2. **District / Upazila admin mode-এ অদৃশ্য** — input disabled আর placeholder "জোন থেকে" থাকলেও zone থেকে value পাঠানো হচ্ছে না, তাই BTRC report-এর জন্য দরকারি জেলা/উপজেলা কোথাও দেখা যায় না।
3. **প্রোফাইল ছবি বাটন কাজ করে না** — শুধু একটা স্ট্যাটিক 👤 placeholder, কোনো file picker / upload নেই। DB-তে `clients.photo_url` কলাম আছে কিন্তু UI নেই।

## ফিক্স প্ল্যান

### File: `src/pages/dashboard/clients/AddClient.tsx`

**A. Required-field validation (admin + POP দুই মোডেই):**

`saveMutation.mutationFn` শুরুতে একটা `validate()` step যোগ:

Required fields list:
- `name`, `client_id`, `contact` (11-digit, 01 দিয়ে শুরু), `nid_number`
- `zone_id`
- `mikrotik_id` (admin মোডে; POP-এ auto)
- `protocol_type`, `connection_type`, `client_type`, `package_id`
- PPPoE হলে `username`, `password`
- Static / Corporate static হলে `static_ip`

Behaviour:
- প্রতিটি field-এ `data-field` attribute যোগ করে একটা `errors: Record<string, string>` state রাখা।
- ভ্যালিডেশন fail হলে — ক্ষেত্রভেদে toast + প্রথম invalid field-কে `scrollIntoView({ behavior: "smooth", block: "center" })` + focus।
- Invalid field-এর `Input/SelectTrigger/Textarea`-এ conditionally `border-destructive ring-1 ring-destructive` ক্লাস যোগ; `<Label>`-এর পাশে ছোট লাল error text।
- টাইপ করলে সেই field-এর error সাফ — `setField`-এর সাথে `clearError(name)`।
- Submit বাটন থেকে কিছু সরানো হবে না; ব্যবহারকারী ক্লিক করলেই validate চলবে।

**B. Zone → District / Upazila auto-derive (admin মোডে):**

- `zonesAdmin` query update — `select("id, name, division_id, district_id, upazila_id")` আর সাথে join করে district/upazila/division-এর নাম তোলা (`districts(id,name), upazilas(id,name), divisions(id,name)`)।
- নতুন `useMemo` `selectedZone` — `form.zone_id` থেকে।
- "জেলা" / "উপজেলা" input দু'টি admin মোডে `selectedZone?.districts?.name` / `selectedZone?.upazilas?.name` দেখাবে (disabled, read-only)।
- "বিভাগ" দেখানোর জন্য একটা ছোট inline note: *"বিভাগ: X · জেলা: Y · উপজেলা: Z"* জোন সিলেক্টরের নিচে — যাতে BTRC-এর তিনটা hierarchy এক জায়গায় দেখা যায়।
- Save payload-এ admin মোডেও `division_id / district_id / upazila_id` জোন থেকে পাঠানো হবে (যদি ইতিমধ্যে form.district_id সেট না থাকে)।

POP মোডে কোনো পরিবর্তন নেই — `popMeta` থেকে আগের মতই আসবে।

**C. প্রোফাইল ছবি আপলোড:**

বর্তমান placeholder div-কে clickable file input-এ রূপান্তর:
- Hidden `<input type="file" accept="image/*">` + লেবেল হিসেবে বৃত্তাকার preview area (camera আইকন overlay)।
- ফাইল সিলেক্ট হলে — local preview দেখানো হবে, `clients.photo_url` ফাঁকা থাকলে save-এর সময় Supabase Storage-এ upload (নতুন public bucket `client-photos`, path `{client_id}/{timestamp}.{ext}`), public URL `payload.photo_url`-এ যাবে।
- Edit মোডে existing `photo_url` থাকলে preview দেখাবে; নতুন ছবি দিলে replace।
- POP মোডে একই flow (upload anon ক্লায়েন্ট দিয়ে, bucket public বলে রিড-এ সমস্যা নেই; insert path `callPortal` এর মতই — শুধু URL string)।
- Max 2MB ও image MIME ভ্যালিডেশন।

### Database migration (alada স্টেপে অনুমোদন)

`client-photos` নামে নতুন public storage bucket + RLS:
- `INSERT/UPDATE/DELETE`: শুধু authenticated users (admin staff)। POP-mode-এ `callPortal` ব্যবহার হলে service-role দিয়ে কাজ চলবে, তাই client-side anon insert-এর policy পরে দরকার পড়লে যোগ হবে।
- `SELECT`: public (bucket public)।

### বাইরে রাখা হচ্ছে

- বাকি ৭০+ field-এর copy/layout পরিবর্তন।
- POP মোডের district/upazila ফ্লো (ইতিমধ্যে `popMeta` থেকে আসছে)।
- Edge function বা billing logic-এ কোনো পরিবর্তন।

## Acceptance

- Required field খালি রেখে Save করলে প্রথম খালি field লাল হয়ে scroll হবে, toast দেখাবে, submit হবে না।
- Admin জোন সিলেক্ট করার সাথে সাথে জেলা/উপজেলা ফিল্ডে নাম এসে যাবে এবং DB-তে ID হিসেবে সেভ হবে।
- প্রোফাইল ছবি বৃত্তে ক্লিক করলে file picker খুলবে, preview আসবে, save করলে `clients.photo_url`-এ public URL সেভ হবে।
