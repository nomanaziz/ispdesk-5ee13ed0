

User shows screenshot: naeem-এর row-এ এখনো "বকেয়া" (red) badge দেখাচ্ছে, যদিও পরিশোধ হয়েছে। কলামে: মাসিক বিল 500, পরিশোধিত 0, বকেয়া 0, অগ্রিম 0।

## Diagnosis

Need to inspect BillingList.tsx to see how it computes "পরিশোধিত / বকেয়া / বিল স্ট্যাটাস" columns. Likely:
1. Query doesn't aggregate from latest billing row, or fetches wrong month
2. Status badge based on `billing.status` but query may return null/old row
3. Column shows 0 paid because joining wrong field

Will check:
- `src/pages/dashboard/billing/BillingList.tsx` query + render
- DB current state for naeem (paid/due/status)

## Fix Plan

1. **Inspect BillingList query** — find which `billing` row it pulls per client (current month vs latest), and which fields drive paid/due/status columns.
2. **Fix the query/render** so:
   - "পরিশোধিত" = `billing.paid` of current month row
   - "বকেয়া" = `billing.due`
   - "অগ্রিম" = `billing.advance`
   - "বিল স্ট্যাটাস" badge: paid → green only, partial → both with paid amount, unpaid → red only
3. **Verify with naeem's row** — after fix, paid=500, due=500, status=partial → both badges show but "পরিশোধিত" column displays 500.
4. If query fetches wrong month (e.g., always current calendar month but bill is for a different month), align month filter with the client's billing cycle.

## Files

- `src/pages/dashboard/billing/BillingList.tsx` — fix query + column rendering for paid/due/advance/status

No DB changes needed (data already correct from previous backfill).

