

## লক্ষ্য
Tariff field-কে **lifetime non-changeable** করা — একবার POP create-এ select হয়ে গেলে আর কেউ (Admin সহ) change করতে পারবে না। সাথে create form-এ লাল warning text দেখানো।

## পরিবর্তন (শুধু `src/components/branches/PopForm.tsx`)

### 1. Tariff field (lines 408–422)
- **Create mode** (লাল warning): label-এর নিচে ছোট লাল text —
  > ⚠️ একবার Tariff সিলেক্ট করলে এটি আর পরিবর্তন করা যাবে না (lifetime fixed)
- **Edit mode**: dropdown সবসময় **disabled + Lock icon**, Admin-এর জন্যও। Tooltip: "Tariff lifetime fixed — পরিবর্তন করা যাবে না"

### 2. Lock logic (line 252)
- `const lockTariff = mode === "edit";` — `!isAdmin` শর্ত সরিয়ে দেব, যাতে Admin-ও change করতে না পারে।

### 3. Save mutation (lines 234–238)
- Edit branch থেকে `basePayload.tariff_id = …` line সরিয়ে দেব, যাতে accidentally update payload-এ না যায়।

## যা **বদলাবে না**
- POP Code, POP Prefix, Username — Admin-only lock যেমন আছে তেমনই থাকবে
- অন্য সব field, validation, mutation flow intact
- `EditManager.tsx`, `Managers.tsx`, allotment, কোনো DB schema — কিছুই touch হবে না
- কোনো migration লাগবে না

approve করলে এই একটি file-এ ৩টি ছোট change apply করব।

