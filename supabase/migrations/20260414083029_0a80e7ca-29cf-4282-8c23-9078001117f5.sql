
-- 1. Shifts table
CREATE TABLE public.shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  grace_minutes int NOT NULL DEFAULT 15,
  late_deduction_amount numeric DEFAULT 0,
  late_deduction_type text DEFAULT 'fixed',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shifts" ON public.shifts FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view shifts" ON public.shifts FOR SELECT TO authenticated USING (true);

-- 2. Employee shift assignments
CREATE TABLE public.employee_shift_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shift_assignments" ON public.employee_shift_assignments FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view shift_assignments" ON public.employee_shift_assignments FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_shift_assignments_employee ON public.employee_shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_date ON public.employee_shift_assignments(date);

-- 3. ZKTeco devices
CREATE TABLE public.zkteco_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  ip_address text NOT NULL,
  port int NOT NULL DEFAULT 4370,
  api_id text,
  api_password text,
  serial_number text,
  location text,
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zkteco_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage zkteco_devices" ON public.zkteco_devices FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view zkteco_devices" ON public.zkteco_devices FOR SELECT TO authenticated USING (true);

-- 4. ZKTeco attendance logs
CREATE TABLE public.zkteco_attendance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.zkteco_devices(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  punch_time timestamptz NOT NULL,
  punch_type text NOT NULL DEFAULT 'check_in',
  device_user_id text,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zkteco_attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage zkteco_logs" ON public.zkteco_attendance_logs FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view zkteco_logs" ON public.zkteco_attendance_logs FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_zkteco_logs_device ON public.zkteco_attendance_logs(device_id);
CREATE INDEX idx_zkteco_logs_employee ON public.zkteco_attendance_logs(employee_id);
CREATE INDEX idx_zkteco_logs_punch_time ON public.zkteco_attendance_logs(punch_time);

-- 5. Attendance rules
CREATE TABLE public.attendance_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  late_after_minutes int NOT NULL DEFAULT 15,
  half_day_after_minutes int NOT NULL DEFAULT 120,
  absent_after_minutes int NOT NULL DEFAULT 240,
  late_deduction numeric DEFAULT 0,
  late_deduction_type text DEFAULT 'fixed',
  absent_deduction numeric DEFAULT 0,
  absent_deduction_type text DEFAULT 'fixed',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage attendance_rules" ON public.attendance_rules FOR ALL TO authenticated USING (is_admin_or_super(auth.uid()));
CREATE POLICY "Authenticated can view attendance_rules" ON public.attendance_rules FOR SELECT TO authenticated USING (true);

-- 6. Alter attendance table
ALTER TABLE public.attendance ADD COLUMN shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN device_log_id uuid REFERENCES public.zkteco_attendance_logs(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN source text NOT NULL DEFAULT 'manual';

-- 7. Alter employees table
ALTER TABLE public.employees ADD COLUMN device_user_id text;
