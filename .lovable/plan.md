## Problem

Excel upload করলে existing rows-এর সাথে নতুন rows append হয়ে যাচ্ছে — duplicate। User-এর চাহিদা: same client (matching key দিয়ে) হলে existing row update হবে, mismatched হলে নতুন row যোগ হবে।

## Fix Scope

শুধু `src/pages/dashboard/mikrotik/BulkImport.tsx` এর `handleFileUpload` function modify হবে। অন্য কোনো file/business logic touch হবে না।

## Merge Logic

Upload করা প্রত্যেক row-এর জন্য existing rows-এ একটা match খুঁজবে এই priority order-এ:

1. **C.Code** (যদি upload row এবং existing row দুটোর-ই থাকে এবং সমান হয়)
2. **UserName** (case-insensitive)
3. **Mobile** (digits-only compare)

Match পেলে → existing row-এর সব field upload row থেকে overwrite হবে (`_idx`, `_mikrotik_client_id`, `_selected`, `_original`, `_codeConflict` preserve থাকবে; `_autoFilled` reset হবে)।  
Match না পেলে → নতুন row হিসেবে append।

## Toast Feedback

`X টি আপডেট, Y টি নতুন যোগ হয়েছে` — user বুঝতে পারবে কতগুলো merge হয়েছে।

## Technical Detail

```ts
const handleFileUpload = (e) => {
  // ...read XLSX as before...
  setRows(prev => {
    const next = [...prev];
    let updated = 0, added = 0;
    const findIdx = (row) => {
      const code = String(row["C.Code"] ?? "").trim();
      const user = String(row["UserName"] ?? "").trim().toLowerCase();
      const mob  = String(row["Mobile"] ?? "").replace(/\D/g, "");
      return next.findIndex(r => {
        const rc = String(r["C.Code"] ?? "").trim();
        const ru = String(r["UserName"] ?? "").trim().toLowerCase();
        const rm = String(r["Mobile"] ?? "").replace(/\D/g, "");
        if (code && rc && code === rc) return true;
        if (user && ru && user === ru) return true;
        if (mob && rm && mob === rm) return true;
        return false;
      });
    };
    for (const row of data) {
      const i = findIdx(row);
      if (i >= 0) {
        next[i] = { ...next[i], ...row, _autoFilled: {} };
        updated++;
      } else {
        next.push({ _idx: Date.now() + Math.random(), _autoFilled: {}, ...row });
        added++;
      }
    }
    toast.success(`${updated} টি আপডেট, ${added} টি নতুন যোগ হয়েছে`);
    return next;
  });
};
```

কোনো DB / schema / অন্য component change নেই।