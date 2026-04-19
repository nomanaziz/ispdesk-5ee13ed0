UPDATE billing
SET status = 'paid'
WHERE COALESCE(amount,0) = 0
  AND COALESCE(due,0) = 0
  AND status <> 'paid';