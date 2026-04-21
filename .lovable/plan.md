

## লক্ষ্য
Transfer Dialog-এ দুটি গুরুত্বপূর্ণ logic যোগ করা:
1. **Same-profile enforcement** — selected সব MikroTik user-এর profile এক না হলে transfer block
2. **Per-day + Monthly cost preview** — fund on/off যাই হোক, hisab clearly দেখাবে

Import page-এ profile filter আগে থেকেই আছে — ওটাকেই কাজে লাগাতে হবে (workflow guidance)।

## Logic Flow

```text
User Import page থেকে 3 user select করে → "Export to POP/Reseller" চাপে
    ↓
Dialog খোলে → selected user-দের profile fetch হয়
    ↓
সব profile একই? ──No──→ 🔴 Red banner: "Mixed profiles detected"
    │                     তালিকা দেখায়: profile-A (2), profile-B (1)
    │                     Export button DISABLED
    │                     Hint: "Import page-এ profile filter ব্যবহার করে এক profile select করুন"
    ↓ Yes
POP + Package select → Profile match check (MikroTik profile vs Tariff profile)
    ↓
Cost preview:
    - Per Day Charge:    ৳X.XX
    - Per User Monthly:  ৳YYY (= selling_rate)
    - Total Monthly:     ৳YYY × N users
    - Total Creditable:  ৳X.XX × N users (same as before)
```

## পরিবর্তন (শুধু `src/components/mikrotik/TransferToPopDialog.tsx`)

### 1. Selected MikroTik clients query (নতুন)
Dialog-এ `selectedIds` দিয়ে rows fetch করব (currently শুধু transfer mutation-এর সময় হয়):
```ts
const { data: selectedRows = [] } = useQuery({
  queryKey: ["mt_selected_for_transfer", selectedIds],
  queryFn: async () => {
    const { data } = await supabase.from("mikrotik_clients")
      .select("id, name, profile").in("id", selectedIds);
    return data || [];
  },
  enabled: open && selectedIds.length > 0,
});
```

### 2. Profile uniformity check
```ts
const profileGroups = useMemo(() => {
  const map = new Map<string, number>();
  selectedRows.forEach((r: any) => {
    const k = r.profile || "(no profile)";
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries()); // [["10mb", 2], ["20mb", 1]]
}, [selectedRows]);
const isMixed = profileGroups.length > 1;
const uniqueProfile = profileGroups.length === 1 ? profileGroups[0][0] : null;
```

### 3. Mixed-profile warning UI (Dialog body-র উপরে)
```text
🔴 Mixed profiles detected — সবগুলো user-এর MikroTik profile এক হতে হবে
   • 10mb-package: 2 users
   • 20mb-package: 1 user
   💡 Import page-এ "প্রোফাইল" filter দিয়ে এক profile-এর user আলাদা করে export করুন
```

### 4. Profile-mismatch warning (selected package vs MikroTik profile)
যদি `selectedPkg.mikrotik_profile` থাকে এবং `uniqueProfile !== selectedPkg.mikrotik_profile` →
```
⚠️ User-দের MikroTik profile "10mb" — কিন্তু Package profile "20mb"। আগে MikroTik-এ profile change করুন।
```

### 5. Cost preview সম্প্রসারণ (existing 3-column → 4-column grid)
| Per Day | Per User Monthly | Total Monthly | Total Creditable |
|---|---|---|---|
| ৳X.XX | ৳YYY | ৳YYY×N | ৳X.XX×N |

Always দেখাবে — fund on/off নির্বিশেষে (fund off হলে শুধু info, deduct হবে না)।

### 6. Export button disable condition update
```ts
disabled={..existing.. || isMixed || (selectedPkg?.mikrotik_profile && uniqueProfile && uniqueProfile !== selectedPkg.mikrotik_profile)}
```

### 7. Mutation guard (server-side safety)
`transfer.mutationFn`-এর শুরুতে:
```ts
if (isMixed) throw new Error("Mixed profile — single profile-এর user select করুন");
```

## যা **বদলাবে না**
- Import page-এর existing profile filter, table, all other UI — intact
- Free-mode logic, balance check, branch_funding insert — intact
- DB schema, RLS, edge functions — কোনো change নাই
- Single-user export বা "Client লিস্টে এক্সপোর্ট" flow — intact

approve করলে এই একটি file-এ ৬টি change apply করব।

