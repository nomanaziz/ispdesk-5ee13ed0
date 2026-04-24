
-- Add columns
ALTER TABLE public.chart_of_accounts
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS description text;

-- Unique index on code so seed can use ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS chart_of_accounts_code_unique ON public.chart_of_accounts (code);

-- Seed default Galaxy Net-style chart of accounts
INSERT INTO public.chart_of_accounts (code, name, type, subtype, description, status) VALUES
  -- ===== ASSET (24) =====
  -- Cash and Bank (17)
  ('1000','Bank','asset','Cash and Bank',NULL,'active'),
  ('1001','Cash on Hand','asset','Cash and Bank','Cash you haven''t deposited in the bank yet','active'),
  ('1002','bKash','asset','Cash and Bank',NULL,'active'),
  ('1003','Cash','asset','Cash and Bank',NULL,'active'),
  ('1004','Foster Payments','asset','Cash and Bank',NULL,'active'),
  ('1005','MCash','asset','Cash and Bank',NULL,'active'),
  ('1006','Nagad','asset','Cash and Bank',NULL,'active'),
  ('1007','Rocket','asset','Cash and Bank',NULL,'active'),
  ('1008','SSL Commerz','asset','Cash and Bank',NULL,'active'),
  ('1009','SureCash','asset','Cash and Bank',NULL,'active'),
  ('1010','UCash','asset','Cash and Bank',NULL,'active'),
  ('1011','Walletmix','asset','Cash and Bank',NULL,'active'),
  ('1012','Other','asset','Cash and Bank',NULL,'active'),
  ('1024','aamarPay','asset','Cash and Bank',NULL,'active'),
  ('1025','PhonePe','asset','Cash and Bank',NULL,'active'),
  ('1026','Razorpay','asset','Cash and Bank',NULL,'active'),
  ('1027','Stripe','asset','Cash and Bank',NULL,'active'),
  -- Expected Payments from Customers (6)
  ('1202','Customer Monthly Bill Receivable','asset','Expected Payments from Customers',NULL,'active'),
  ('1203','Installation Charge Receivable','asset','Expected Payments from Customers',NULL,'active'),
  ('1204','Bandwidth Sales Receivable','asset','Expected Payments from Customers',NULL,'active'),
  ('1205','Macreseller Account Receivable','asset','Expected Payments from Customers',NULL,'active'),
  ('1206','Product Sales Receivable','asset','Expected Payments from Customers',NULL,'active'),
  ('1207','Service Sales Receivable','asset','Expected Payments from Customers',NULL,'active'),
  -- Inventory (1)
  ('1301','Stock','asset','Inventory',NULL,'active'),

  -- ===== EXPENSE (40) =====
  -- Operating Expense (15)
  ('5000','Conveyance Allowance','expense','Operating Expense',NULL,'active'),
  ('5001','Office Entertainment','expense','Operating Expense',NULL,'active'),
  ('5002','Network Equipments','expense','Operating Expense',NULL,'active'),
  ('5003','ISP Digital Software','expense','Operating Expense',NULL,'active'),
  ('5004','Office Rent','expense','Operating Expense',NULL,'active'),
  ('5005','REVE SMS Service','expense','Operating Expense',NULL,'active'),
  ('5006','Office Supplies and Cost','expense','Operating Expense',NULL,'active'),
  ('5007','Employee''s Food Allowance','expense','Operating Expense',NULL,'active'),
  ('5008','IP Phone recharge','expense','Operating Expense',NULL,'active'),
  ('5010','Dot Net Bandwidth Purchase','expense','Operating Expense',NULL,'active'),
  ('5011','Phone Recharge','expense','Operating Expense',NULL,'active'),
  ('5012','SJP - Galaxy Net','expense','Operating Expense',NULL,'active'),
  ('5013','Sadia Enterprise','expense','Operating Expense',NULL,'active'),
  ('5014','Tech bd payment','expense','Operating Expense',NULL,'active'),
  ('5033','Inventory Item Purchase','expense','Operating Expense',NULL,'active'),
  -- Cost of Goods Sold (1)
  ('5101','Cost of Sold Stock Items','expense','Cost of Goods Sold',NULL,'active'),
  -- Payment Processing Fee (4)
  ('5200','Bank Charge','expense','Payment Processing Fee',NULL,'active'),
  ('5201','Nagad','expense','Payment Processing Fee',NULL,'active'),
  ('5202','Designer Fee','expense','Payment Processing Fee',NULL,'active'),
  ('5203','bKash Charge','expense','Payment Processing Fee','bKash Charge','active'),
  -- Payroll Expense (6)
  ('5301','Payroll – Salary & Wages','expense','Payroll Expense','Wages and salaries paid to your employees','active'),
  ('5302','Advance Salary','expense','Payroll Expense',NULL,'active'),
  ('5303','Festival Bonus','expense','Payroll Expense','Eid Bonus, New Year Bonus etc.','active'),
  ('5304','Turjo sir Salary','expense','Payroll Expense',NULL,'active'),
  ('5305','Titu sir Salary','expense','Payroll Expense',NULL,'active'),
  ('5306','Marketing','expense','Payroll Expense',NULL,'active'),
  -- Uncategorized Expense (12)
  ('5400','Medical Allowance','expense','Uncategorized Expense',NULL,'active'),
  ('5401','Uncategorized Expense','expense','Uncategorized Expense','A business cost you haven''t categorized yet. Categorize it later.','active'),
  ('5402','Sales Taxes','expense','Uncategorized Expense',NULL,'active'),
  ('5403','Prime Bank EMI','expense','Uncategorized Expense',NULL,'active'),
  ('5404','Brac Bank EMI','expense','Uncategorized Expense',NULL,'active'),
  ('5405','Onu Return','expense','Uncategorized Expense',NULL,'active'),
  ('5406','VAT/ TAX','expense','Uncategorized Expense',NULL,'active'),
  ('5407','Electricity Bill','expense','Uncategorized Expense',NULL,'active'),
  ('5408','Donation','expense','Uncategorized Expense',NULL,'active'),
  ('5409','APNIC Payment','expense','Uncategorized Expense',NULL,'active'),
  ('5410','Bank deposite','expense','Uncategorized Expense',NULL,'active'),
  ('5411','City Bank EMI','expense','Uncategorized Expense',NULL,'active'),
  -- Discount (2)
  ('5600','Inventory Item Purchase/ office goods','expense','Discount',NULL,'active'),
  ('5601','Bandwidth Purchase Discount','expense','Discount',NULL,'active'),

  -- ===== INCOME (14) =====
  -- Income (6)
  ('4001','Cutomer Monthly Bill','income','Income',NULL,'active'),
  ('4002','Macreseller Balance','income','Income',NULL,'active'),
  ('4003','Installation Charge','income','Income',NULL,'active'),
  ('4004','Bandwidth Sales Invoice','income','Income',NULL,'active'),
  ('4005','Product Sales Invoice','income','Income',NULL,'active'),
  ('4006','Service Sales Invoice','income','Income',NULL,'active'),
  -- Discount (7)
  ('4100','Discount','income','Discount',NULL,'active'),
  ('4101','Customer Monthly Bill Discount','income','Discount',NULL,'active'),
  ('4102','Bandwidth Sales Discount','income','Discount',NULL,'active'),
  ('4103','Macreseller Fund Discount','income','Discount',NULL,'active'),
  ('4104','Installation Charge Discount','income','Discount',NULL,'active'),
  ('4105','Product Sales Discount','income','Discount',NULL,'active'),
  ('4106','Service Sales Discount','income','Discount',NULL,'active'),
  -- Uncategorized Income (1)
  ('4301','Uncategorized Income','income','Uncategorized Income','Income you haven''t categorized yet. Categorize it later.','active'),

  -- ===== LIABILITIES (6) =====
  -- Expected Payments to Vendors (3)
  ('2201','Accounts Payable','liability','Expected Payments to Vendors',NULL,'active'),
  ('2202','Bandwidth Purchase Payable','liability','Expected Payments to Vendors',NULL,'active'),
  ('2203','Inventory Item Purchase Payable','liability','Expected Payments to Vendors',NULL,'active'),
  -- Due For Payroll (1)
  ('2401','Payroll Liabilities','liability','Due For Payroll',NULL,'active'),
  -- Customer Prepayments and Customer Credits (2)
  ('2601','Customer Monthly Bill Advanced','liability','Customer Prepayments and Customer Credits',NULL,'active'),
  ('2602','Macreseller Fund Advanced','liability','Customer Prepayments and Customer Credits',NULL,'active'),

  -- ===== OWNER'S EQUITY (2) =====
  ('3001','Owner Investment','equity','Business Owner Contribution and Drawing','Owner investment represents the amount of money or assets that the owner contributes to the business.','active'),
  ('3101','Owner''s Equity','equity','Retained Earnings','Owner''s equity is what remains after you subtract liabilities from assets.','active')
ON CONFLICT (code) DO NOTHING;
