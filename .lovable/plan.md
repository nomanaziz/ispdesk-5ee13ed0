

## Plan: Shift Management & ZKTeco Attendance Integration

### Database Migration (5 new tables)

**1. `shifts`** — shift definitions
- `id` (uuid PK), `name` (text, e.g. "Morning", "Night"), `start_time` (time), `end_time` (time), `grace_minutes` (int, default 15), `late_deduction_amount` (numeric), `late_deduction_type` (text: fixed/percentage), `status` (text), `created_at`

**2. `employee_shift_assignments`** — monthly roster
- `id` (uuid PK), `employee_id` (FK → employees), `shift_id` (FK → shifts), `date` (date), `created_by` (uuid), `created_at`
- UNIQUE(employee_id, date)

**3. `zkteco_devices`** — registered ZKTeco devices
- `id` (uuid PK), `name` (text), `ip_address` (text), `port` (int, default 4370), `api_id` (text), `api_password` (text), `serial_number` (text), `location` (text), `status` (text, default 'active'), `last_sync_at` (timestamptz), `created_at`

**4. `zkteco_attendance_logs`** — raw punch logs from devices
- `id` (uuid PK), `device_id` (FK → zkteco_devices), `employee_id` (FK → employees), `punch_time` (timestamptz), `punch_type` (text: check_in/check_out), `device_user_id` (text), `synced_at` (timestamptz), `created_at`

**5. `attendance_rules`** — late/absence deduction rules
- `id` (uuid PK), `name` (text), `late_after_minutes` (int), `half_day_after_minutes` (int), `absent_after_minutes` (int), `late_deduction` (numeric), `late_deduction_type` (text), `absent_deduction` (numeric), `absent_deduction_type` (text), `status` (text), `created_at`

Also alter `attendance` table: add `shift_id` (FK → shifts), `device_log_id` (FK → zkteco_attendance_logs), `source` (text: manual/device).

RLS: admin manage, authenticated read on all new tables.

---

### Frontend Pages (4 new files)

**1. `ShiftManagement.tsx`** — `/dashboard/hr/shifts`
- **Shift Definitions tab**: CRUD for shifts (name, start/end time, grace period)
- **Monthly Roster tab**: Calendar-style grid. Select month → shows all employees as rows, dates as columns. Click cell to assign shift. Bulk assign shift to employee for full month.
- Color-coded shift badges per cell

**2. `ZktecoDevices.tsx`** — `/dashboard/hr/zkteco-devices`
- CRUD table: Device Name, IP, Port, API ID, Password (masked), Serial, Location, Status, Last Sync
- "Add Device" dialog with all connection fields
- "Sync Now" button per device (calls edge function)
- Connection status indicator

**3. `AttendanceRules.tsx`** — `/dashboard/hr/attendance-rules`
- CRUD: Rule name, late threshold (minutes), half-day threshold, absent threshold
- Deduction amounts (fixed/percentage) for late and absent
- These rules will be used in future for payroll deduction calculation

**4. Update `Attendance.tsx`** — add "Source" column (Manual/Device), link to shift, show expected vs actual time

---

### Edge Function: `sync-zkteco-data`

- Accepts device connection details
- Calls ZKTeco device API (ZKTeco devices expose a REST API or use the ZK Web API protocol over HTTP)
- Fetches attendance logs, maps device user IDs to employees
- Inserts into `zkteco_attendance_logs` and auto-updates `attendance` table
- Can be triggered manually ("Sync Now") or scheduled via pg_cron

---

### Sidebar & Routing Updates

Add 3 new items under "HR & Payroll":
- Shift Management → `/dashboard/hr/shifts`
- ZKTeco Devices → `/dashboard/hr/zkteco-devices`
- Attendance Rules → `/dashboard/hr/attendance-rules`

---

### Technical Notes

- ZKTeco devices typically use the **ZKBioAccess** or **PULL SDK** REST API over HTTP (IP:port). The edge function will make HTTP requests to the device's API endpoint using the stored credentials.
- Employee-to-device mapping: employees table will get a `device_user_id` (text) column to map ZKTeco enrollment IDs to employees.
- The `attendance` table's `check_in`/`check_out` fields will be auto-populated from device logs when source is "device".
- Late detection: compare `check_in` time against assigned shift's `start_time + grace_minutes`.
- Future salary deduction logic will read `attendance_rules` and apply deductions during payroll generation.

