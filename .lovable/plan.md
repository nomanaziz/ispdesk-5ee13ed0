

## লক্ষ্য
আপনার screenshot অনুযায়ী **"Export to MAC/POP Reseller"** dialog-কে full workflow-এ আনা। এখন dialog শুধু POP + MikroTik সিলেক্ট করে — **Package, Per-day charge, Creditable amount** নাই। এটাই missing।

## আপনার বর্ণিত flow (যেভাবে কাজ করবে)

```text
Import from MikroTik page (10 PPPoE user MikroTik-এ)
  ├─ 7 জন already client list-এ আছে → এখানে দেখাবে না (auto-filter)
  └─ 3 জন unmatched → "Pending" list-এ বসে থাকবে
        │
        ├─ Single → row-এর পাশে [Export] button → আমাদের নিজস্ব client list-এ যাবে
        │
        └─ Multiple checkbox → উপরে [Export to POP/Reseller] button
              │
              └─ Popup খুলবে:
                    ├─ MAC Reseller (POP) সিলেক্ট ⭣
                    ├─ Package সিলেক্ট (ওই POP-এর tariff থেকে) ⭣
                    ├─ Per Day Charge   (auto: selling_rate / validity_days)
                    ├─ Selected Clients (auto: যত জন টিক)
                    └─ Creditable Amount (auto: per_day × selected) — POP balance থেকে কাটবে
                    [Close]   [Export ✓]
```

## পরিবর্তন (শুধু ২ ফাইল)

### 1. `src/components/mikrotik/TransferToPopDialog.tsx` — পুরো dialog refactor

বর্তমান POP + MikroTik field রেখে নিচে যোগ:

| Field | Logic |
|---|---|
| **Package** dropdown | POP সিলেক্ট হলে → `reseller_tariff_packages` থেকে যেগুলো ওই POP-এর `tariff_id`-এর সাথে যুক্ত + status='active' সেগুলো দেখাবে। Display: `{package_name} ({mikrotik_profile})` |
| **Per Day Charge** (read-only) | `selling_rate / validity_days` — auto গণনা |
| **Selected Clients** (read-only) | `selectedIds.length` |
| **Creditable Amount** (read-only) | `per_day × selected` |

Submit-এ:
- Selected MikroTik users → `clients` table-এ insert (যেমন এখন আছে), সাথে `package_id`, `monthly_bill = selling_rate` set
- `mikrotik_clients` rows update (transferred flags — যেমন আছে)
- POP balance debit: `branch_managers.balance -= creditable_amount`
- `branch_funding_transactions`-এ একটা log row insert (`trans_type='deduction'`, reference = "MikroTik export to POP")

POP balance যদি creditable amount-এর চেয়ে কম হয় (এবং POP `pop_type='prepaid'` হয়), তাহলে warning toast দেখিয়ে block করব।

### 2. `src/pages/dashboard/mikrotik/Import.tsx` — minor (no UI change প্রায়)
- Button label "POP-এ ট্রান্সফার" → **"Export to POP/Reseller"** (clarity)
- Single row-এর `ExternalLink` icon-এর tooltip আরো clear: "নিজস্ব client list-এ export"
- বাকি সব আগের মতই

## DB নিয়ে
- কোনো নতুন column লাগবে না — সব field already আছে
- কোনো migration লাগবে না
- Balance debit-এর জন্য existing `apply_branch_funding_to_balance` trigger reuse — শুধু `branch_funding_transactions`-এ row insert করলেই POP balance auto-update হবে

## যা **বদলাবে না**
- `Import.tsx`-এর filter, table, single-export, "Client লিস্টে এক্সপোর্ট (bulk)" button — সব intact
- Reseller portal-এর "MikroTik Users" page এবং "Bulk Client Import" — intact
- কোনো RLS / route / permission change নাই
- কোনো existing data বা client touch হবে না

## ফাইল

| ফাইল | কাজ |
|---|---|
| `src/components/mikrotik/TransferToPopDialog.tsx` | Package + Per-day + Creditable + balance debit logic |
| `src/pages/dashboard/mikrotik/Import.tsx` | Button label tweak |

approve করলে এই ২টি change apply করব।

