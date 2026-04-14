

## Plan: Enhanced Billing List + Client Profile Page

### Overview
1. Enhance `BillingList.tsx` to show ALL client types (active, free, personal, left, paid, due, partial due, overdue, advance) with more summary cards
2. Create a new `ClientProfile.tsx` page with full client info (matching the reference screenshot) — accessible via View button
3. Add route for client profile page

### Changes

**1. Rebuild `BillingList.tsx`**
- Remove `.eq("status", "active")` filter — fetch ALL clients regardless of status
- Add client type filter: Active, Free, Personal, Left
- Add more summary cards:
  - Row 1: Total Clients, Active, Free/Personal, Left
  - Row 2: Paid, Due, Partial Due, Overdue (expire_date passed)
  - Row 3: Received Amount, Due Amount, Advance Amount, Monthly Bill Total
- Add billing status filter options: Paid, Due, Partial, Overdue
- Add client status filter: Active, Free, Personal, Left
- View button navigates to `/dashboard/billing/client/:id`

**2. Create `ClientProfile.tsx`** (new file)
- **Left Sidebar Panel** (matching reference):
  - Client avatar placeholder
  - Client Code, Client ID/IP, Billing Status, MikroTik Status toggle, Creation Date
  - Action buttons: Update Information, Status Scheduler, Send Email/Message, Package Scheduler, Download Information, Go To Client List
- **Right Content Area with Tabs**:
  - **Service Information**: Package, Profile/Speed, Joining Date, Client Type, Billing Start Month, Username/IP, Expire Date, Password, Monthly Bill, Balance Due, Reference By, Connection Setup By, Last Log In
  - **Network & Product Information**: Connection Type, Protocol Type, MAC Address, Server, Remote Address, Device Type, Device Serial, ONU ID, Fiber Code, Core details
  - **Personal Information**: Father/Mother Name, Date of Birth, Gender, NID, Occupation, Email, Phone, Address, Permanent Address
  - **Generated & Updated Bill/Invoices**: Billing history table from `billing` table
  - **Received Bill History**: Collections from `bill_collections` table
  - **Complain History**: From support tickets
  - **Remarks History**: Client remarks
- Data fetched from `clients` JOIN zones, packages, billing, bill_collections

**3. Routing (`App.tsx`)**
- Add import for `ClientProfile`
- Add route: `/dashboard/billing/client/:id`

### Technical Details
- Client profile uses `useParams()` to get client ID
- All data via `@tanstack/react-query` + Supabase
- BillingList View button: `useNavigate()` to `/dashboard/billing/client/${c.id}`
- Bangla UI labels throughout
- No database changes needed — all columns already exist in `clients` table

