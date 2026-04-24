

## Billing List-এ VIP indicator যোগ করা

### এখন কী আছে
- `BillingList.tsx`-এ client query ইতিমধ্যে `is_vip` field fetch করছে ✅
- Bulk action-এ "VIP করুন / VIP বাতিল" বাটন আছে ✅
- কিন্তু **table row-এ VIP visually দেখা যায় না** — তাই কে VIP, কে non-VIP চেনার উপায় নাই

`ClientList.tsx`-এ ইতিমধ্যে যে pattern use করা হয়েছে (Crown icon + purple badge), সেই same pattern Billing list-এ add করব — consistency-র জন্য।

---

### পরিবর্তন

**File:** `src/pages/dashboard/billing/BillingList.tsx`

**"কাস্টমার নাম" column-এর cell-এ change** (line ~435):

আগে:
```tsx
<TableCell className="font-medium">{c.name}</TableCell>
```

পরে:
```tsx
<TableCell className="font-medium">
  <div className="flex items-center gap-1">
    {c.is_vip && <Crown className="h-3 w-3 text-purple-500" />}
    <span>{c.name}</span>
    {c.is_vip && (
      <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/30">
        VIP
      </Badge>
    )}
  </div>
</TableCell>
```

**Import add:** `Crown` from `lucide-react` (Badge already imported)।

---

### Outcome
- Billing list-এ VIP client-এর নামের পাশে **purple Crown 👑 icon + ছোট "VIP" badge** দেখা যাবে
- Non-VIP client-এর নামে কিছুই থাকবে না — পরিষ্কার পার্থক্য
- কোনো DB change লাগবে না, কোনো extra query লাগবে না — শুধু UI render
- Client list এবং Billing list-এ same VIP look, consistent UX

