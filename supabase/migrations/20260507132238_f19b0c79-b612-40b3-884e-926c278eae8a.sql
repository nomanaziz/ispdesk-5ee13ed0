
ALTER TABLE public.automatic_processes ALTER COLUMN execute_at DROP NOT NULL;

ALTER TABLE public.automatic_processes
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'system';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'automatic_processes_scope_key_unique') THEN
    ALTER TABLE public.automatic_processes
      ADD CONSTRAINT automatic_processes_scope_key_unique UNIQUE (scope, process_key);
  END IF;
END $$;

INSERT INTO public.automatic_processes (scope, process_key, process_name, execute_at, interval_type, execution_day, enabled)
VALUES
  ('system','fund_credit_postpaid_pops','Fund Credit & Disable of Postpaid POPs','00:05','daily','today',true),
  ('system','sync_customers_servers','Sync All Customer By Servers',NULL,'hourly','tomorrow',true),
  ('system','gen_monthly_bill_customers','Generate Monthly Bill of Customers','06:00','daily','tomorrow',true),
  ('system','disable_unpaid_customers','Disable Unpaid Customers','12:00','daily','tomorrow',true),
  ('system','sms_unpaid_before_expiry','Send SMS To Unpaid Customers Before Expiry Date','08:30','daily','tomorrow',true),
  ('system','pkg_scheduler_customers','Package Scheduler of Customers','23:40','daily','tomorrow',true),
  ('system','status_scheduler_customers','Status Scheduler of Customers','23:30','daily','tomorrow',true),
  ('system','validate_payments','Validate Payments of Customers',NULL,'hourly','tomorrow',true),
  ('system','failed_fund_credit_mac','Failed Fund Credit of MAC Reseller Clients','00:15','daily','tomorrow',true),
  ('system','fund_credit_failed_mac','Fund Credit of Failed MAC Resellers','06:30','daily','tomorrow',true),
  ('system','check_neg_bal_mac','Check Negative Balance of MAC Resellers','07:00','daily','tomorrow',true),
  ('system','del_extra_mac_mt_users','Delete Extra MAC Reseller Mikrotik Users','05:30','daily','tomorrow',true),
  ('system','disable_mac_low_bal','Disable MAC Reseller Users For Low Balance',NULL,'hourly','tomorrow',true),
  ('system','gen_monthly_bill_mac','Generate Monthly Bill of MAC Resellers','06:15','daily','tomorrow',true),
  ('system','sms_mac_unpaid_expiry','Send SMS To Unpaid MAC Client Before Expiry Date','08:45','daily','tomorrow',true),
  ('system','gen_recurring_bw_invoice','Generate Recurring Bandwidth Sale Invoice','03:00','daily','tomorrow',true),
  ('system','proc_attendance_logs','Process for Attendance Logs',NULL,'hourly','tomorrow',true),
  ('system','exec_manual_processes','Execute Manual Processes',NULL,'minutely','tomorrow',true),
  ('system','data_seed_flex','Data Seed In Flex Value Table','06:30','daily','tomorrow',true),
  ('system','sync_expire_crm','Sync Expire Date With CRM','01:40','daily','tomorrow',true),
  ('system','prepaid_pop_renewal','Prepaid POP Clients Automatic Renewal & Disable','07:00','daily','today',true),
  ('system','prepaid_mac_validity','Prepaid MAC Reseller Clients Validity Checker','00:30','daily','tomorrow',true),
  ('system','sync_mac_clients','Sync All MAC Reseller Clients By Servers',NULL,'hourly','tomorrow',true),
  ('system','disabled_unpaid_to_inactive','Disabled Unpaid Customers Status Change To InActive','23:20','daily','tomorrow',true),
  ('system','crm_eligibility_check','CRM Eligibility Checker','04:15','daily','tomorrow',true)
ON CONFLICT (scope, process_key) DO NOTHING;
