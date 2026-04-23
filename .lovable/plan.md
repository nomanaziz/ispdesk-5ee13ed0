

## প্রতিটি Category-তে Default Items যোগ করা

### লক্ষ্য
আগে যেসব networking categories/sub-categories add করা হয়েছে — প্রতিটিতে অন্তত ১-২টা realistic networking item seed করে দেওয়া, যাতে inventory খালি না থাকে এবং Network Node-এ assign করার সময় readymade options পাওয়া যায়।

### Approach
Database-এ `inventory_items` table-এ bulk INSERT করা হবে। প্রতিটি item-এর জন্য:
- `name` — brand/model সহ realistic নাম
- `code` — auto-generated SKU (e.g., `UTP-CAT5-001`)
- `category_id` — sub-category-এর সাথে link
- `unit_id` — appropriate unit (Meters/Pcs/Box)
- `purchase_price` + `sale_price` — Bangladesh market-এ realistic BDT rate
- `quantity` — default starting stock (10-100)
- `store_id` — "Main Store" (MAIN-01)
- `status` — active

### Items যোগ হবে (sub-category অনুযায়ী)

**Cables:**
- Cat 5 → D-Link Cat5e UTP, AMP Cat5e UTP (Meters)
- Cat 6 → D-Link Cat6 UTP, Systimax Cat6 (Meters)
- 2/4/6/12/16/24 Core Fiber → প্রতিটিতে ১টা single-mode fiber roll (Meters)

**Server (Bandwidth Mgmt):**
- MikroTik → CCR2004-1G-12S+2XS, RB5009UG+S+IN (Pcs)
- Cisco → ISR 4321, Catalyst 2960 (Pcs)

**Switch:**
- Manageable → Cisco SG350-28, MikroTik CRS328 (Pcs)
- Unmanaged → TP-Link TL-SG1008D, D-Link DES-1008A (Pcs)

**OLT:**
- GEPON OLT → BDCOM GP3600-08, V-SOL V1600D (Pcs)
- EPON OLT → C-Data FD1108S, BDCOM P3310B (Pcs)

**ONU:**
- EPON ONU → V-SOL V2801RW, BDCOM GP1704-4F (Pcs)
- GEPON ONU → C-Data FD511GW, Huawei HG8310M (Pcs)

**Router (WiFi):**
- 1/2/3/4 Antenna → TP-Link, TENDA, D-Link variants (Pcs)

**Equipment:**
- Ethernet Crimp Tool → Standard RJ45 Crimper (Pcs)
- (extras: Fiber Cleaver, OTDR যদি থাকে)

**PON Module:**
- EPON OLT Module, GPON OLT Module — SFP modules (Pcs)

**Splitter:**
- 1*2, 1*4, 1*8, 1*16, 1*32, 1*64 → প্রতিটি size-এর FTTH splitter (Pcs)

মোট ≈ 35-40টা item।

### Technical Steps
1. **Read current data**: query `inventory_categories` (id+name+parent_id), `inventory_units`, `store_locations` দিয়ে actual UUIDs পাওয়া।
2. **Build INSERT script**: প্রতিটি sub-category-এর leaf node-এ items map করা।
3. **Execute via insert tool** (data operation, migration না): `INSERT INTO inventory_items ... ON CONFLICT (name) DO NOTHING` — duplicate prevent করতে।
4. **Verify**: `SELECT count(*)` দিয়ে confirm যে items add হয়েছে।

### ফলাফল
- `/dashboard/inventory/items` page-এ ৩৫+ readymade networking item দেখা যাবে
- প্রতিটির default stock থাকবে (Network Node-এ assign করা যাবে সাথে সাথে)
- Bangla locale-এ price display হবে (existing UI already supports)
- কোনো UI/code change লাগবে না — শুধু data seed

