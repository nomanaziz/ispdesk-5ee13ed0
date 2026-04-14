

## Plan: Client Module - Full Implementation

This is a large feature covering 6 sub-modules of the Client management system. Based on the reference screenshots and existing database schema, here is the implementation plan.

---

### Database Changes (Migration)

The existing tables cover most needs, but we need new tables and columns:

**1. Alter `client_requests` table** - add missing columns visible in screenshot:
- `customer_type` (text) - Home/Corporate
- `connection_type_id` (uuid FK → connection_types_config)
- `otc_charge` (numeric) - one-time connection charge
- `physical_connectivity` (text) - Pending/Completed
- `setup_status` (text, default 'Pending') - Pending/Completed
- `setup_by` (uuid FK → profiles)
- `setup_time` (timestamptz)
- `assigned_to` (uuid FK → profiles)
- `schedule_date` (date) - when to set up the line
- `monthly_bill` (numeric)
- `billing_date` (integer)
- `subzone_id` (uuid FK → sub_zones)
- `created_by` (uuid FK → profiles)

**2. Create `client_schedulers` table:**
- `id` (uuid PK)
- `client_id` (uuid FK → clients)
- `scheduler_type` (text) - 'package_scheduler' | 'status_scheduler'
- `previous_info` (text)
- `schedule_info` (text)
- `remarks` (text)
- `schedule_date` (date)
- `status` (text, default 'pending')
- `created_by` (uuid FK → profiles)
- `created_at` (timestamptz)

**3. Create `portal_categories` table:**
- `id` (uuid PK), `name` (text), `description` (text), `status` (text), `created_at`

**4. Create `portal_servers` table:**
- `id` (uuid PK), `category_id` (uuid FK → portal_categories), `name` (text), `url` (text), `description` (text), `status` (text), `created_at`

**5. Alter `clients` table** - add missing columns from screenshot:
- `password` (text)
- `username` (text)
- `remote_address` (text)
- `mac_address` (text)
- `protocol_type` (text)
- `profile` (text)
- `billing_status` (text, default 'Active')
- `mikrotik_status` (text)
- `server_name` (text)
- `gender` (text)
- `father_name` (text)
- `mother_name` (text)
- `nid_number` (text)
- `date_of_birth` (date)
- `occupation` (text)
- `remarks` (text)
- `phone_number` (text)
- `latitude` (text)
- `longitude` (text)
- `road_number` (text)
- `house_number` (text)
- `permanent_address` (text)
- `box_id` (uuid FK → boxes)
- `cable_length` (numeric)
- `fiber_code` (text)
- `core_count` (integer)
- `core_color` (text)
- `device_type` (text)
- `device_serial` (text)
- `vendor` (text)
- `purchase_date` (date)
- `expire_date` (date)
- `joining_date` (date)
- `billing_start_month` (text)
- `reference_by` (text)
- `is_vip` (boolean, default false)
- `connected_by` (text)
- `affiliator_id` (uuid FK → affiliates)
- `left_date` (date)
- `left_reason` (text)

---

### Frontend Pages (6 files)

**1. `NewRequest.tsx`** - Client Request List (image-7.png)
- Date range filters (from/to), Setup Status dropdown, Setup By/Assign To, Created By
- "+ Client Request" button opens a **multi-step dialog** (4 steps from image-8.png): Personal Info → Contact Info → Network & Product Info → Service Info
- Table columns: SN, Name, Mobile, Address, Zone, Subzone, Cus.Type, Conn.Type, Package, M.Bill, B.Date, OTC, Phy.Connectivity, Created By, Created On, Status, SetUp By, SetUp Time
- Status badges (Pending green, Completed blue)
- "Assign" button to assign setup technician
- Duration counter showing time since creation
- Schedule date field in the request form

**2. `AddClient.tsx`** - Full Add Client Form (add_client.png)
- Single-page form with 4 sections (colored headers):
  - Personal Information: name, profile picture, NID, gender, DOB, father/mother name, occupation, remarks, NID picture, registration form picture
  - Contact Information: latitude/longitude, mobile, phone, district, upazila, present/permanent address, email, social links, road/house number
  - Network & Product Information: server (mikrotik), protocol type, zone, sub zone, box, connection type, cable length, fiber code, core count/color, device, serial, vendor, purchase date
  - Service Information: client code, package, profile, client type, billing status, username/IP, remote address, password, joining date, monthly bill, billing start month, expire date, reference, VIP toggle, connected by, affiliator
- "Save & Exit" button

**3. `ClientList.tsx`** - Client List with Summary Cards (image-9.png)
- Summary cards: Running Clients, New Clients, Renewed Clients, Waiver Clients
- Action buttons: Generate Excel, Generate PDF, Bulk Profile/Package/Status Change
- Table columns: C.Code, ID/IP, Password (masked), Cus. Name, Mobile, Zone, Conn.Type, Cus.Type, R.Address, Package/Speed, M.Bill, MAC Addr, Server, B.Status, M.Status, Action
- Search, entries per page, checkbox selection
- Per-row action menu (edit, SMS, view, etc.)

**4. `LeftClients.tsx`** - Left/Disconnected Clients (image-10.png)
- Filters: Zone, Connection Type, Client Type, Package, Protocol Type, From/To Left Date, Recovery Status, Recovered By
- Generate Excel/PDF buttons
- Table: C.Code, ID/IP, Client Name, Mobile, Zone, Connection Type, Client Type, R.Address, Package/Speed, M.Bill, Due, Server, B.Status, Left Date, Action
- Recovery status tracking (Recovered badge)

**5. `Scheduler.tsx`** - Package/Status Scheduler (image-11.png)
- Filters: Scheduler Type (Package/Status), Activity Status, From/To Date, Created By
- "Create Schedule" button opens dialog with: User Name (searchable), Scheduler Type dropdown, schedule details
- "Cancel Schedules" for bulk cancel
- Table: Code, ID/IP, CustomerName, Mobile, Zone, PreviousInfo, ScheduleInfo, Remarks, CreatedBy, CreatedDate, ScheduleDate, Status
- Generate PDF/CSV

**6. `ChangeRequest.tsx`** - Change Request Management (image-12.png)
- Filters: Request Type, Request Status, From/To Date, Occurring Date, Created By
- "Cancel Request" and "Approve Request" bulk actions
- Table: Code, ID/IP, Name, Mobile, Zone, CurrentPackage, RequestedPackage, CurrentBillDate, RequestedBillDate, Remarks, CreatedBy, CreatedDate, OccurringDate, Status
- Generate PDF/CSV

**7. `PortalManage.tsx`** - Portal Management (image-13.png)
- Left sidebar tabs: Notices, Media Servers, News & Events, Speed Test Server, Registered Clients
- Media Servers section has sub-tabs: Server Categories, Media Servers
- CRUD for portal categories and servers

---

### Implementation Order

Due to the large scope, I recommend implementing in phases:

**Phase 1 (this session):**
1. Database migration for all new tables/columns
2. `NewRequest.tsx` - the request list with filters and multi-step add dialog
3. `ClientList.tsx` - the main client list with summary cards

**Phase 2 (next):**
4. `AddClient.tsx` - the full add client form
5. `LeftClients.tsx` - left clients with filters
6. `Scheduler.tsx` and `ChangeRequest.tsx`
7. `PortalManage.tsx`

### Technical Notes
- All dropdowns (zone, package, connection type, protocol type, etc.) pull from existing config tables
- File uploads (profile picture, NID picture) require a Supabase storage bucket
- The multi-step "New Client Request" dialog will use local state to manage steps
- Client code auto-generation pattern: name prefix + sequential number
- Duration counter uses `created_at` timestamp difference

