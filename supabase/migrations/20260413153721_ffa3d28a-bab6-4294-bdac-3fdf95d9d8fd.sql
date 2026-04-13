
-- Boxes table
CREATE TABLE public.boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  zone_id uuid REFERENCES public.zones(id),
  sub_zone_id uuid REFERENCES public.sub_zones(id),
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage boxes" ON public.boxes FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view boxes" ON public.boxes FOR SELECT TO authenticated USING (true);

-- Districts table
CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage districts" ON public.districts FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view districts" ON public.districts FOR SELECT TO authenticated USING (true);

-- Upazilas table
CREATE TABLE public.upazilas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upazilas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage upazilas" ON public.upazilas FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view upazilas" ON public.upazilas FOR SELECT TO authenticated USING (true);

-- Client requests (new signup requests)
CREATE TABLE public.client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  email text,
  address text,
  zone_id uuid REFERENCES public.zones(id),
  package_id uuid REFERENCES public.isp_packages(id),
  connection_type text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage client_requests" ON public.client_requests FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view client_requests" ON public.client_requests FOR SELECT TO authenticated USING (true);

-- Change requests
CREATE TABLE public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  request_type text NOT NULL DEFAULT 'package',
  old_value text,
  new_value text,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage change_requests" ON public.change_requests FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view change_requests" ON public.change_requests FOR SELECT TO authenticated USING (true);

-- HR tables
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view departments" ON public.departments FOR SELECT TO authenticated USING (true);

CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage positions" ON public.positions FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view positions" ON public.positions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  department_id uuid REFERENCES public.departments(id),
  position_id uuid REFERENCES public.positions(id),
  joining_date date,
  salary numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view employees" ON public.employees FOR SELECT TO authenticated USING (true);

CREATE TABLE public.payheads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'allowance',
  amount numeric DEFAULT 0,
  is_percentage boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payheads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payheads" ON public.payheads FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view payheads" ON public.payheads FOR SELECT TO authenticated USING (true);

CREATE TABLE public.payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  basic_salary numeric DEFAULT 0,
  total_allowance numeric DEFAULT 0,
  total_deduction numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payroll" ON public.payroll FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view payroll" ON public.payroll FOR SELECT TO authenticated USING (true);

CREATE TABLE public.resign_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notice_period_days integer DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resign_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage resign_rules" ON public.resign_rules FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view resign_rules" ON public.resign_rules FOR SELECT TO authenticated USING (true);

CREATE TABLE public.resignations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  resign_date date NOT NULL,
  last_working_date date,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resignations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage resignations" ON public.resignations FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view resignations" ON public.resignations FOR SELECT TO authenticated USING (true);

-- Leave Management
CREATE TABLE public.leave_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days_allowed integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage leave_categories" ON public.leave_categories FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view leave_categories" ON public.leave_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE public.leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.leave_categories(id) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer DEFAULT 1,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage leave_applications" ON public.leave_applications FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view leave_applications" ON public.leave_applications FOR SELECT TO authenticated USING (true);

-- Inventory
CREATE TABLE public.inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage inventory_units" ON public.inventory_units FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view inventory_units" ON public.inventory_units FOR SELECT TO authenticated USING (true);

CREATE TABLE public.store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage store_locations" ON public.store_locations FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view store_locations" ON public.store_locations FOR SELECT TO authenticated USING (true);

CREATE TABLE public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage inventory_categories" ON public.inventory_categories FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view inventory_categories" ON public.inventory_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  category_id uuid REFERENCES public.inventory_categories(id),
  unit_id uuid REFERENCES public.inventory_units(id),
  purchase_price numeric DEFAULT 0,
  sale_price numeric DEFAULT 0,
  quantity integer DEFAULT 0,
  store_id uuid REFERENCES public.store_locations(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage inventory_items" ON public.inventory_items FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view inventory_items" ON public.inventory_items FOR SELECT TO authenticated USING (true);

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'in',
  quantity integer NOT NULL DEFAULT 0,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);

-- Purchase
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  email text,
  address text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view vendors" ON public.vendors FOR SELECT TO authenticated USING (true);

CREATE TABLE public.requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_no text NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id),
  quantity integer DEFAULT 1,
  vendor_id uuid REFERENCES public.vendors(id),
  estimated_cost numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage requisitions" ON public.requisitions FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view requisitions" ON public.requisitions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_no text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  item_id uuid REFERENCES public.inventory_items(id),
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  purchase_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage purchases" ON public.purchases FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view purchases" ON public.purchases FOR SELECT TO authenticated USING (true);

CREATE TABLE public.purchase_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no text NOT NULL,
  vendor_id uuid REFERENCES public.vendors(id),
  amount numeric DEFAULT 0,
  paid numeric DEFAULT 0,
  due numeric DEFAULT 0,
  bill_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage purchase_bills" ON public.purchase_bills FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view purchase_bills" ON public.purchase_bills FOR SELECT TO authenticated USING (true);

-- Sales & Service
CREATE TABLE public.product_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  item_id uuid REFERENCES public.inventory_items(id),
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  total numeric DEFAULT 0,
  invoice_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage product_invoices" ON public.product_invoices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view product_invoices" ON public.product_invoices FOR SELECT TO authenticated USING (true);

CREATE TABLE public.service_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  service_name text NOT NULL,
  amount numeric DEFAULT 0,
  invoice_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'unpaid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage service_invoices" ON public.service_invoices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view service_invoices" ON public.service_invoices FOR SELECT TO authenticated USING (true);

CREATE TABLE public.installation_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  amount numeric DEFAULT 0,
  paid numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  fee_date date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.installation_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage installation_fees" ON public.installation_fees FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view installation_fees" ON public.installation_fees FOR SELECT TO authenticated USING (true);

-- Assets
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  category text,
  purchase_date date,
  purchase_price numeric DEFAULT 0,
  location text,
  assigned_to uuid REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage assets" ON public.assets FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view assets" ON public.assets FOR SELECT TO authenticated USING (true);

CREATE TABLE public.destroyed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id),
  item_name text NOT NULL,
  destroy_date date DEFAULT CURRENT_DATE,
  reason text,
  destroyed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.destroyed_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage destroyed_items" ON public.destroyed_items FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view destroyed_items" ON public.destroyed_items FOR SELECT TO authenticated USING (true);

-- Accounting
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'asset',
  parent_id uuid REFERENCES public.chart_of_accounts(id),
  balance numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage chart_of_accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view chart_of_accounts" ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);

CREATE TABLE public.income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.chart_of_accounts(id),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  income_date date DEFAULT CURRENT_DATE,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage income_entries" ON public.income_entries FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view income_entries" ON public.income_entries FOR SELECT TO authenticated USING (true);

CREATE TABLE public.expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.chart_of_accounts(id),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  expense_date date DEFAULT CURRENT_DATE,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage expense_entries" ON public.expense_entries FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view expense_entries" ON public.expense_entries FOR SELECT TO authenticated USING (true);

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no text NOT NULL,
  debit_account_id uuid REFERENCES public.chart_of_accounts(id),
  credit_account_id uuid REFERENCES public.chart_of_accounts(id),
  amount numeric NOT NULL DEFAULT 0,
  description text,
  entry_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view journal_entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);

-- SMS Service
CREATE TABLE public.sms_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_url text,
  api_key text,
  sender_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sms_gateways" ON public.sms_gateways FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view sms_gateways" ON public.sms_gateways FOR SELECT TO authenticated USING (true);

CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'general',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sms_templates" ON public.sms_templates FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view sms_templates" ON public.sms_templates FOR SELECT TO authenticated USING (true);

CREATE TABLE public.sms_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sms_groups" ON public.sms_groups FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view sms_groups" ON public.sms_groups FOR SELECT TO authenticated USING (true);

CREATE TABLE public.sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  message text NOT NULL,
  gateway_id uuid REFERENCES public.sms_gateways(id),
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage sms_log" ON public.sms_log FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view sms_log" ON public.sms_log FOR SELECT TO authenticated USING (true);

-- Bandwidth Buy
CREATE TABLE public.bw_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_categories" ON public.bw_categories FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_categories" ON public.bw_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bw_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_providers" ON public.bw_providers FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_providers" ON public.bw_providers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bw_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES public.bw_categories(id),
  provider_id uuid REFERENCES public.bw_providers(id),
  bandwidth text,
  price numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_items" ON public.bw_items FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_items" ON public.bw_items FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bw_purchase_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no text NOT NULL,
  provider_id uuid REFERENCES public.bw_providers(id),
  amount numeric DEFAULT 0,
  paid numeric DEFAULT 0,
  month date,
  status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_purchase_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_purchase_bills" ON public.bw_purchase_bills FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_purchase_bills" ON public.bw_purchase_bills FOR SELECT TO authenticated USING (true);

-- Bandwidth Sale
CREATE TABLE public.bw_sale_pops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  bandwidth text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_sale_pops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_sale_pops" ON public.bw_sale_pops FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_sale_pops" ON public.bw_sale_pops FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bw_sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL,
  pop_id uuid REFERENCES public.bw_sale_pops(id),
  amount numeric DEFAULT 0,
  month date,
  status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_sales_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_sales_invoices" ON public.bw_sales_invoices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_sales_invoices" ON public.bw_sales_invoices FOR SELECT TO authenticated USING (true);

CREATE TABLE public.bw_recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id uuid REFERENCES public.bw_sale_pops(id),
  amount numeric DEFAULT 0,
  interval_months integer DEFAULT 1,
  next_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bw_recurring_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bw_recurring_invoices" ON public.bw_recurring_invoices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view bw_recurring_invoices" ON public.bw_recurring_invoices FOR SELECT TO authenticated USING (true);

-- Task Management
CREATE TABLE public.task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage task_categories" ON public.task_categories FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view task_categories" ON public.task_categories FOR SELECT TO authenticated USING (true);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.task_categories(id),
  assigned_to uuid,
  priority text DEFAULT 'medium',
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);

-- Support categories
CREATE TABLE public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage support_categories" ON public.support_categories FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view support_categories" ON public.support_categories FOR SELECT TO authenticated USING (true);

-- Support tickets (expand)
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  category_id uuid REFERENCES public.support_categories(id),
  subject text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  assigned_to uuid,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage support_tickets" ON public.support_tickets FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view support_tickets" ON public.support_tickets FOR SELECT TO authenticated USING (true);

-- Events & Holidays
CREATE TABLE public.events_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  end_date date,
  type text DEFAULT 'holiday',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage events_holidays" ON public.events_holidays FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view events_holidays" ON public.events_holidays FOR SELECT TO authenticated USING (true);

-- Affiliates
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  email text,
  commission_rate numeric DEFAULT 0,
  total_earned numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view affiliates" ON public.affiliates FOR SELECT TO authenticated USING (true);

-- VAS
CREATE TABLE public.vas_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric DEFAULT 0,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vas_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vas_services" ON public.vas_services FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view vas_services" ON public.vas_services FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vas_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  service_id uuid REFERENCES public.vas_services(id),
  amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  transaction_date date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vas_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage vas_transactions" ON public.vas_transactions FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view vas_transactions" ON public.vas_transactions FOR SELECT TO authenticated USING (true);

-- Branch extras
CREATE TABLE public.branch_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  branch_id uuid REFERENCES public.branches(id),
  name text NOT NULL,
  contact text,
  email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage branch_managers" ON public.branch_managers FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view branch_managers" ON public.branch_managers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.branch_funding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id),
  amount numeric DEFAULT 0,
  type text DEFAULT 'allocation',
  description text,
  funding_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.branch_funding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage branch_funding" ON public.branch_funding FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view branch_funding" ON public.branch_funding FOR SELECT TO authenticated USING (true);

-- Trigger for employees updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
