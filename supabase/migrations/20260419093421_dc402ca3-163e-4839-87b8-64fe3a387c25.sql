-- Sync billing.amount with current clients.monthly_bill for current month,
-- and recompute due = amount - paid - discount (clamped to 0).
-- Also recompute status accordingly.
UPDATE billing b
SET amount = c.monthly_bill,
    due = GREATEST(c.monthly_bill - COALESCE(b.paid,0) - COALESCE(b.discount,0), 0),
    status = CASE
      WHEN c.monthly_bill - COALESCE(b.paid,0) - COALESCE(b.discount,0) <= 0 AND COALESCE(b.paid,0) + COALESCE(b.discount,0) > 0 THEN 'paid'
      WHEN COALESCE(b.paid,0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
FROM clients c
WHERE b.client_id = c.id
  AND b.month = date_trunc('month', CURRENT_DATE)::date
  AND b.amount IS DISTINCT FROM c.monthly_bill;