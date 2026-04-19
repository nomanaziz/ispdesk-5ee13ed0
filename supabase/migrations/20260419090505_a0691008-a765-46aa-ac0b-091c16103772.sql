-- Backfill: link orphan bill_collections to their billing rows, then update billing + insert income entries
-- Step 1: link unmatched collections to billing of the same client+month
UPDATE public.bill_collections bc
SET billing_id = b.id
FROM public.billing b
WHERE bc.billing_id IS NULL
  AND bc.client_id = b.client_id
  AND to_char(b.month::date, 'YYYY-MM') = to_char(bc.created_at, 'YYYY-MM')
  AND bc.status = 'approved';

-- Step 2: recompute paid/due/status on billing from approved collections
WITH agg AS (
  SELECT billing_id,
         SUM(amount) AS sum_amt,
         SUM(COALESCE(discount,0)) AS sum_disc
  FROM public.bill_collections
  WHERE status = 'approved' AND billing_id IS NOT NULL
  GROUP BY billing_id
)
UPDATE public.billing b
SET paid = agg.sum_amt,
    discount = agg.sum_disc,
    due = GREATEST(0, b.amount - agg.sum_amt - agg.sum_disc),
    status = CASE
      WHEN b.amount - agg.sum_amt - agg.sum_disc <= 0 THEN 'paid'
      WHEN agg.sum_amt > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    pay_date = COALESCE(b.pay_date, CURRENT_DATE)
FROM agg
WHERE b.id = agg.billing_id
  AND (b.paid IS NULL OR b.paid <> agg.sum_amt);

-- Step 3: backfill income_entries for approved collections that don't have one yet
INSERT INTO public.income_entries (
  amount, source, description, income_date, month, client_id, payment_method, reference, status
)
SELECT
  bc.amount,
  'bill_collection',
  'বিল কালেকশন (auto-backfill) — ' || COALESCE(c.name, ''),
  bc.created_at::date,
  to_char(bc.created_at, 'YYYY-MM'),
  bc.client_id,
  bc.payment_method,
  bc.billing_id::text,
  'approved'
FROM public.bill_collections bc
LEFT JOIN public.clients c ON c.id = bc.client_id
LEFT JOIN public.income_entries ie
  ON ie.client_id = bc.client_id
  AND ie.amount = bc.amount
  AND ie.income_date = bc.created_at::date
  AND ie.source = 'bill_collection'
WHERE bc.status = 'approved'
  AND ie.id IS NULL;