INSERT INTO public.billing_statuses (name, status, color)
SELECT 'VIP', 'active', '#7c3aed'
WHERE NOT EXISTS (SELECT 1 FROM public.billing_statuses WHERE name = 'VIP');