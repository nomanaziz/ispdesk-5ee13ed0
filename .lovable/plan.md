

## Plan: Redesign All System Pages — Galaxy Net Style

### Overview
Redesign every System module page to match the Galaxy Net portal's layout and functionality. The portal uses a clean, full-width design with teal/dark header bars, icon-prefixed fields, tabbed interfaces, and breadcrumb navigation. Our current pages are narrow cards — we'll expand them to full-width sections with richer field sets.

### Design Pattern (from Galaxy Net)
- Page header: Icon + Title + subtitle, breadcrumb on right
- Full-width content sections with teal/dark section headers
- 3-column grid layouts for form fields with icon-prefixed inputs
- Tabbed interfaces where applicable (Invoice: Invoice Settings / Money Receipt; App Users: Application Users / User Roles / Role Modules)
- Submit/Update button at bottom-right of each section
- Status badges (green "Active", red "InActive")
- Data tables with search, show entries, and pagination

### Pages to Redesign (8 files)

**1. Company Setup (`Company.tsx`)** — Match portal exactly:
- Full-width form: Company Name*, Email, Address 1, Address 2, Mobile 1, Mobile 2, Phone 1, Phone 2, Logo upload
- Client Code: radio (Customizable / Automatic)
- "Want to Show in Login Page?" checkbox
- "Update Company Information" button

**2. Invoice Setup (`Invoice.tsx`)** — Two tabs:
- **Invoice Settings tab**: Company info toggle (Name, Email, Mobile, Website, Upload Logo, Address), Invoice Title, Invoice position (Left/Right/None radios), Number per page select, Margins (top/bottom), Notes section (dynamic add/remove)
- **Money Receipt tab**: Same company info toggle, Receipt Title, Format (A4/Half), Position (Left/Middle/Right), Margins, Notes
- Submit button at bottom

**3. App Users (`Users.tsx`)** — Three tabs:
- **Application Users tab**: Filter row (User Status, Employee, User Role dropdowns), search bar, table (Sr.No, User Name, Password masked with eye toggle, Status badge, Employee, Role/Group, Assigned Module, Action: view/delete). "+ New User" button
- **User Roles(Groups) tab**: Table (Sr.No, Name, Status, RedirectURL, CreatedBy, CreatedOn, Action). "+ New Role(Group)" button
- **Role Modules(Permissions) tab**: Table (Sr.No, Role, Status, Modules, Permissions, CreatedBy, CreatedOn, Action). "+ New Role Module(Permission)" button

**4. System Setup (`Setup.tsx`)** — Expand to full-width:
- Currency, Symbol, Timezone, Date Format, Language, Billing Cycle in 3-column grid
- Icon-prefixed fields matching portal style

**5. Email Setup (`Email.tsx`)** — Full-width section:
- SMTP fields in 3-column grid with icons
- Test Email button + Save

**6. Payment Gateways (`PaymentGateways.tsx`)** — Full-width cards:
- Keep existing toggle design but expand to match portal width

**7. Periods Setup (`Periods.tsx`)** — Full-width:
- Expand grid, add icons

**8. Processing Fee (`SysProcessingFee.tsx`)** — Full-width:
- Expand layout

### Technical Details
- Remove `max-w-2xl` / `max-w-xl` constraints from all pages
- Use consistent teal-dark section headers (`bg-[#2c5f6e]` or similar)
- Tabs via shadcn `Tabs` component
- Data tables with search input, entries-per-page select, pagination
- No new database tables needed — uses existing `system_settings`, `profiles`, `user_roles`
- All Bangla UI labels maintained

### Files to Edit (8)
- `src/pages/dashboard/system/Company.tsx`
- `src/pages/dashboard/system/Invoice.tsx`
- `src/pages/dashboard/system/Users.tsx`
- `src/pages/dashboard/system/Setup.tsx`
- `src/pages/dashboard/system/Email.tsx`
- `src/pages/dashboard/system/PaymentGateways.tsx`
- `src/pages/dashboard/system/Periods.tsx`
- `src/pages/dashboard/system/SysProcessingFee.tsx`

