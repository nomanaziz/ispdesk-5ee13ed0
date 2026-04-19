UPDATE billing
SET due = GREATEST(COALESCE(amount,0) - COALESCE(paid,0) - COALESCE(discount,0), 0),
    status = CASE
      WHEN COALESCE(amount,0) = 0 THEN 'paid'
      WHEN COALESCE(amount,0) - COALESCE(paid,0) - COALESCE(discount,0) <= 0 AND COALESCE(paid,0) + COALESCE(discount,0) > 0 THEN 'paid'
      WHEN COALESCE(paid,0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END;