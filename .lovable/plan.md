# Block Profile সাসপেনশন মোড

বর্তমানে bill overdue হলে client টার MikroTik account disable হয়ে যায়। নতুন মোডে disable না করে শুধু MikroTik profile-টা একটা **block-profile**-এ change হবে — user connect করতে পারবে কিন্তু internet পাবে না। Bill পরিশোধ হলে আগের profile auto restore হবে।

## যা থাকবে

### Settings (২টা)
1. **Auto-suspension on/off** — ইতিমধ্যেই আছে।
2. **Suspension Mode** — নতুন:
   - `disable` (পুরনো default)
   - `block_profile` — MikroTik profile change হবে
3. **Block Profile name** — MikroTik-এ যে profile-টা set হবে (default: `block-profile`)। UI-তে dropdown — MikroTik থেকে fetch করা profile list থেকে select।

### Scope
- **Global** setting → admin level।
- **Per-POP/Reseller override** → প্রতিটা POP চাইলে নিজের mode + block_profile_name set করতে পারবে; না করলে global inherit হবে।

### Auto-restore on payment
Bill paid হলে — client-এর `original_profile` field-এ আগের profile saved থাকবে, সেটা restore করে field টা clear করা হবে।

---

## কাজগুলো

### 1. Database migration
- `clients` table-এ নতুন column: `original_profile text` (suspension-এর আগের profile store করার জন্য)।
- `branch_managers` (POP) table-এ:
  - `suspension_mode text` — values: `inherit` / `disable` / `block_profile` (default `inherit`)
  - `block_profile_name text` (nullable)
- `system_settings.auto_suspension` JSON-এ নতুন keys: `mode`, `block_profile_name` (schema change নয়, value extension)।

### 2. Edge function: `enforce-expired-disable` update
- প্রত্যেক overdue client-এর জন্য effective mode resolve:
  POP override থাকলে সেটা, না থাকলে global।
- `mode = disable` → আগের মতই behavior।
- `mode = block_profile`:
  - `clients.original_profile`-এ current profile copy করে রাখা (যদি ইতিমধ্যেই block না হয়ে থাকে),
  - `manage-mikrotik-ppp` action=`update` দিয়ে `profile = block_profile_name` push,
  - `mikrotik_status = enabled` রাখা, `billing_status = blocked` set করা।

### 3. Payment restore hook
- নতুন helper edge function `restore-client-profile` (বা existing payment-success path-এ inline):
  Payment confirm হওয়ার পর যদি client-এর `original_profile` non-null হয়,
  - `manage-mikrotik-ppp` action=`update` দিয়ে profile restore,
  - DB-তে `original_profile = null`, `billing_status = paid`।
- Existing payment confirmation/edge function-এ এটা call করা হবে।

### 4. UI
- **Admin → Billing → Auto-Suspension Scheduler** (`AutoSuspensionScheduler.tsx`):
  - Mode radio: `Disable` / `Block Profile`
  - Block Profile name input + একটা MikroTik device সিলেক্ট করে "Fetch profiles" বাটন (existing `list-profiles` action ব্যবহার করে dropdown populate)।
- **POP/Reseller settings page** (`src/pages/reseller/...config`):
  - Override fields — Mode (Inherit/Disable/Block Profile) + Block Profile name।

### 5. সতর্কতা / Notes
- VIP/Personal/Free clients এক্ষেত্রেও skip হবে (current behavior অপরিবর্তিত)।
- Block profile actually MikroTik-এ exist করতে হবে; UI dropdown সেটা enforce করতে সাহায্য করবে।
- Block profile-এ থাকা user-কে আবার manual enable/disable করলেও DB consistency রাখা হবে (status flow রিভিউ)।

## যা পরিবর্তন হবে না
- বর্তমান disable mode পুরোপুরি কাজ করবে — শুধু একটা option হিসেবে block_profile যোগ হচ্ছে।
- SMS/notification flow আগের মতই।

Approve করলে আমি migration + edge function update + UI টা implement শুরু করব।
