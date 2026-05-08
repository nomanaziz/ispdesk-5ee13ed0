
-- ============================================================
-- 1. Anonymous write removal on config tables
-- ============================================================
DROP POLICY IF EXISTS "zones_insert_anon" ON public.zones;
DROP POLICY IF EXISTS "zones_update_anon" ON public.zones;
DROP POLICY IF EXISTS "zones_delete_anon" ON public.zones;
DROP POLICY IF EXISTS "zones_insert_auth" ON public.zones;
DROP POLICY IF EXISTS "zones_update_auth" ON public.zones;
DROP POLICY IF EXISTS "zones_delete_auth" ON public.zones;

DROP POLICY IF EXISTS "sub_zones_insert_anon" ON public.sub_zones;
DROP POLICY IF EXISTS "sub_zones_update_anon" ON public.sub_zones;
DROP POLICY IF EXISTS "sub_zones_delete_anon" ON public.sub_zones;
DROP POLICY IF EXISTS "sub_zones_insert_auth" ON public.sub_zones;
DROP POLICY IF EXISTS "sub_zones_update_auth" ON public.sub_zones;
DROP POLICY IF EXISTS "sub_zones_delete_auth" ON public.sub_zones;

DROP POLICY IF EXISTS "boxes_insert_anon" ON public.boxes;
DROP POLICY IF EXISTS "boxes_update_anon" ON public.boxes;
DROP POLICY IF EXISTS "boxes_delete_anon" ON public.boxes;
DROP POLICY IF EXISTS "boxes_insert_auth" ON public.boxes;
DROP POLICY IF EXISTS "boxes_update_auth" ON public.boxes;
DROP POLICY IF EXISTS "boxes_delete_auth" ON public.boxes;

DROP POLICY IF EXISTS "departments_insert_anon" ON public.departments;
DROP POLICY IF EXISTS "departments_update_anon" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_anon" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_auth" ON public.departments;
DROP POLICY IF EXISTS "departments_update_auth" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_auth" ON public.departments;

DROP POLICY IF EXISTS "positions_insert_anon" ON public.positions;
DROP POLICY IF EXISTS "positions_update_anon" ON public.positions;
DROP POLICY IF EXISTS "positions_delete_anon" ON public.positions;
DROP POLICY IF EXISTS "positions_insert_auth" ON public.positions;
DROP POLICY IF EXISTS "positions_update_auth" ON public.positions;
DROP POLICY IF EXISTS "positions_delete_auth" ON public.positions;

DROP POLICY IF EXISTS "Anon manage designations" ON public.designations;
DROP POLICY IF EXISTS "Anon read designations" ON public.designations;

-- ============================================================
-- 2. client_traffic_monthly: scope writes to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert traffic monthly" ON public.client_traffic_monthly;
DROP POLICY IF EXISTS "Service role can update traffic monthly" ON public.client_traffic_monthly;
CREATE POLICY "Service role can insert traffic monthly"
  ON public.client_traffic_monthly FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update traffic monthly"
  ON public.client_traffic_monthly FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. shop_orders: remove public read
-- ============================================================
DROP POLICY IF EXISTS "orders_public_read" ON public.shop_orders;
CREATE POLICY "Admins can view shop_orders"
  ON public.shop_orders FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 4. warranty_claims: remove public read
-- ============================================================
DROP POLICY IF EXISTS "claims_public_read" ON public.warranty_claims;
CREATE POLICY "Authenticated can view warranty_claims"
  ON public.warranty_claims FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 5. support_tickets / support_ticket_messages: remove public read
-- ============================================================
DROP POLICY IF EXISTS "Public can view support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Anyone can read ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Authenticated can view ticket messages"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 6. bw_sales_invoices, bw_purchase_orders(_items): remove public read
-- ============================================================
DROP POLICY IF EXISTS "Public can view bw_sales_invoices" ON public.bw_sales_invoices;
DROP POLICY IF EXISTS "Public can view bw_purchase_orders" ON public.bw_purchase_orders;
DROP POLICY IF EXISTS "Public can view bw_purchase_order_items" ON public.bw_purchase_order_items;

-- Re-bind admin-manage policies to authenticated only
DROP POLICY IF EXISTS "Admins manage bw purchase orders" ON public.bw_purchase_orders;
CREATE POLICY "Admins manage bw purchase orders"
  ON public.bw_purchase_orders FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Admins manage bw purchase order items" ON public.bw_purchase_order_items;
CREATE POLICY "Admins manage bw purchase order items"
  ON public.bw_purchase_order_items FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Authenticated can view bw_purchase_orders"
  ON public.bw_purchase_orders FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated can view bw_purchase_order_items"
  ON public.bw_purchase_order_items FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 7. pop_daily_charges
-- ============================================================
DROP POLICY IF EXISTS "Public read pop_daily_charges" ON public.pop_daily_charges;
DROP POLICY IF EXISTS "Admins can manage pop_daily_charges" ON public.pop_daily_charges;
CREATE POLICY "Admins can manage pop_daily_charges"
  ON public.pop_daily_charges FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view pop_daily_charges"
  ON public.pop_daily_charges FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 8. salary_sheets: remove blanket public ALL
-- ============================================================
DROP POLICY IF EXISTS "salary_sheets_portal_all" ON public.salary_sheets;

-- ============================================================
-- 9. pop_fund_recharges
-- ============================================================
DROP POLICY IF EXISTS "Admins manage all pop fund recharges" ON public.pop_fund_recharges;
CREATE POLICY "Admins manage all pop fund recharges"
  ON public.pop_fund_recharges FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 10. employees: remove public select + auth write-all
-- ============================================================
DROP POLICY IF EXISTS "employees_select_all" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_auth" ON public.employees;
DROP POLICY IF EXISTS "employees_update_auth" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_auth" ON public.employees;

-- ============================================================
-- 11. mikrotik_clients: restrict to admin
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view mikrotik_clients" ON public.mikrotik_clients;
DROP POLICY IF EXISTS "Authenticated users can create mikrotik_clients" ON public.mikrotik_clients;
DROP POLICY IF EXISTS "Authenticated users can update mikrotik_clients" ON public.mikrotik_clients;
DROP POLICY IF EXISTS "Authenticated users can delete mikrotik_clients" ON public.mikrotik_clients;
CREATE POLICY "Admins manage mikrotik_clients"
  ON public.mikrotik_clients FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 12. app_users — admins only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view app_users" ON public.app_users;
CREATE POLICY "Admins can view app_users"
  ON public.app_users FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 13. branch_managers — admins only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view branch_managers" ON public.branch_managers;
CREATE POLICY "Admins can view branch_managers"
  ON public.branch_managers FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 14. sms_gateways — admins only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view sms_gateways" ON public.sms_gateways;
DROP POLICY IF EXISTS "Authenticated users can manage sms_gateways" ON public.sms_gateways;

-- ============================================================
-- 15. media_servers — admins only (drop public select)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read active media servers" ON public.media_servers;
CREATE POLICY "Admins can view media_servers"
  ON public.media_servers FOR SELECT TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 16. bw_sale_customers — admins only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage bw_sale_customers" ON public.bw_sale_customers;
CREATE POLICY "Admins can manage bw_sale_customers"
  ON public.bw_sale_customers FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

-- ============================================================
-- 17. bw_reseller_users — bind admin policy to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins manage bw reseller users" ON public.bw_reseller_users;
CREATE POLICY "Admins manage bw reseller users"
  ON public.bw_reseller_users FOR ALL TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));
