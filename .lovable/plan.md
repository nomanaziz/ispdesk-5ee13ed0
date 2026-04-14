

## Plan: Inventory Management — Full Page Implementation

### Overview
Implement all 5 inventory pages (currently placeholders) with full CRUD UI and Supabase integration. All tables already exist — no database migration needed. The inventory will handle ISP network materials like Fiber, ONU, TJ Box, Patchcord, SFP, Short Cable, Switch, etc.

### Pages to Implement

**1. Units (`Units.tsx`)** — পরিমাপ একক
- "+ Add Unit" dialog: Name, Short Name, Status
- Table: Serial, Name, Short Name, Status (badge), Created Date, Actions (edit/delete)
- Search filter
- Pre-populated ISP units: Meter, Roll, Piece (পিস), Box, Coil, Set

**2. Store Locations (`Locations.tsx`)** — স্টোর লোকেশন
- "+ Add Location" dialog: Name, Address, Status
- Table: Serial, Name, Address, Status (badge), Created Date, Actions (edit/delete)
- Search filter

**3. Item Categories (`InventoryCategories.tsx`)** — আইটেম ক্যাটাগরি
- "+ Add Category" dialog: Name, Status
- Table: Serial, Category Name, Status (badge), Created Date, Actions (edit/delete)
- Search filter
- ISP-specific categories: Fiber Cable, ONU/ONT, Connector & Splitter, Networking Equipment, Cable Accessories, Tools

**4. Items (`InventoryItems.tsx`)** — আইটেম তালিকা
- "+ Add Item" dialog: Name, Code, Category (select), Unit (select), Purchase Price, Sale Price, Store Location (select), Status
- Summary cards: Total Items, Active, Low Stock (quantity < 10)
- Filters: Category, Store Location, Search
- Table: Serial, Code, Name, Category, Unit, Purchase Price, Sale Price, Current Stock (quantity), Store, Status (badge), Actions (edit/delete)
- Common ISP items: Fiber Cable (1km Roll), ONU Device, TJ Box, Patchcord, SFP Module, Short Cable, Network Switch, Splitter (1:8/1:16), Drop Wire, HDPE Pipe

**5. Stock (`Stock.tsx`)** — স্টক ম্যানেজমেন্ট
- Two sections: Stock In / Stock Out via `stock_movements` table
- "+ Stock In" / "+ Stock Out" buttons
- Dialog: Item (select from inventory_items), Quantity, Type (in/out), Reference (PO number, etc.), Notes
- On save: insert into `stock_movements` + update `inventory_items.quantity` accordingly
- Summary cards: Total Stock In (today), Total Stock Out (today), Total Items in Stock
- Filters: Item, Type (in/out), Date Range, Search
- Table: Serial, Item Name, Type (badge: Stock In green / Stock Out red), Quantity, Reference, Notes, Date, Actions (delete)

### Technical Details
- All queries via `@tanstack/react-query` + Supabase client
- Items page joins `inventory_categories`, `inventory_units`, `store_locations` for dropdown selects and display names
- Stock page updates `inventory_items.quantity` on each stock movement (increment for "in", decrement for "out")
- Same UI pattern as Vendors/Purchases pages (already implemented)
- Bangla UI labels throughout
- No database migration needed — all 5 tables exist

### Files to Edit (5)
- `src/pages/dashboard/inventory/Units.tsx`
- `src/pages/dashboard/inventory/Locations.tsx`
- `src/pages/dashboard/inventory/InventoryCategories.tsx`
- `src/pages/dashboard/inventory/InventoryItems.tsx`
- `src/pages/dashboard/inventory/Stock.tsx`

