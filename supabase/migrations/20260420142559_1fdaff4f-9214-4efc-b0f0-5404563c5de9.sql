UPDATE public.branch_managers
SET password='Galaxy@123',
    pop_type='postpaid',
    client_code=COALESCE(NULLIF(client_code,''),'0002'),
    portal_enabled=true,
    status='Active'
WHERE username='reseller01';