-- Demo POP Reseller
INSERT INTO public.branch_managers (
  name, username, password, email, contact, address,
  pop_type, balance, portal_enabled, status,
  tariff_id, permissions, company_name, pop_level,
  client_create_permission, min_balance
) VALUES (
  'Demo POP Reseller', 'reseller01', '123456',
  'reseller@test.com', '01700000001', 'Dhaka, Bangladesh',
  'prepaid', 5000, true, 'Active',
  '872c2e15-8bf5-4cfd-8b20-b545dc247db1',
  '{"config.zone":true,"config.subzone":true,"config.box":true,"config.package":true,"config.district":true,"config.upazila":true,"config.connection_type":true,"config.protocol":true,"config.device":true,"mikrotik.servers":true,"mikrotik.import":true,"mikrotik.bulk_import":true,"hr.add_employee":true,"hr.employees":true,"hr.salary":true,"hr.payroll":true,"hr.attendance":true,"client.add":true,"client.list":true,"client.left":true,"client.scheduler":true,"client.change_request":true,"client.portal_manage":true,"billing.list":true,"billing.invoice":true,"billing.daily_collection":true,"billing.client_profile":true,"pgw.gateways":false,"pgw.settlement":false,"pgw.payments":false,"monitor.online_clients":true,"monitor.ping":true,"monitor.pop_devices":true,"support.categories":true,"support.tickets":true,"support.history":true,"sms.template":true,"sms.individual":true,"sms.group":true,"sms.gateway":true,"sms.send":true,"report.btrc":true,"report.bill_collection":true,"report.messages":true,"report.processing_fee":true,"report.discount":true,"report.due_sms":true,"report.financial":true,"report.customer":true,"fund.debit":true,"fund.credit":true}'::jsonb,
  'Demo POP Co.', 1, true, 100
) ON CONFLICT DO NOTHING;

-- Demo BW Reseller
INSERT INTO public.bw_sale_customers (
  customer_name, customer_code, username, password,
  activity_status, email, mobile, contact_person, address
) VALUES (
  'Demo BW Reseller', 'BW001', 'bwcustomer01', '123456',
  'Active', 'bw@test.com', '01700000002', 'BW Contact', 'Dhaka, BD'
) ON CONFLICT DO NOTHING;

-- Demo Client
INSERT INTO public.clients (
  name, client_id, username, password,
  status, billing_status, contact, email, address,
  zone_id, package_id, monthly_bill
) VALUES (
  'Demo Client', 'CL001', 'client01', '123456',
  'Active', 'Active', '01700000003', 'client@test.com', 'Dhaka, BD',
  'c4849e24-a720-4372-a2e3-2713c5d431d7',
  '56b0ef5e-8208-47af-a1d6-a9bf9cdeaa52',
  500
) ON CONFLICT DO NOTHING;