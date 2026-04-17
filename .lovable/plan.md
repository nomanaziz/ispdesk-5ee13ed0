

## Network Diagram Module — Plan

User চান একটা complete Network Diagram module যেখানে OLT/Splitter/Client topology visualize হবে, inventory-linked components add হবে, এবং map view সহ আরও sub-pages থাকবে।

### Reference (screenshots থেকে বোঝা)
1. **Diagram** — Tree view (root → splitter → ONU), right-click context menu
2. **Network POP / Virtual Nodes** — Node list (DC-GORAN, CORE RTR, OLT_1...)
3. **Clients in Diagram** — Customer node assignments
4. **Network Connections** — Source ↔ Target edges with type/color/status
5. **Distributed Inv. Items** — Items deployed per node
6. **Network View in Map** — Geo-located nodes on Leaflet map

### Existing state
- `src/pages/dashboard/network/Diagram.tsx`, `Map.tsx`, `DistributedItems.tsx` — সব Placeholder
- `Pop.tsx`, `Connections.tsx`, `NetworkClients.tsx` — exist (need check)
- Inventory module already exists (`InventoryItems`, `Stock`, `InventoryCategories`)

### Database (new migration)

```sql
-- Node types: pop, olt, splitter_main, splitter_sub, switch, router, onu, client, custom
network_nodes (
  id, tenant_id, name, node_type, parent_id (FK self),
  branch_id, olt_device_id (FK olt_devices),
  inventory_item_id (FK inventory_items, optional),
  serial_number, mac, port_info,
  latitude, longitude, address,
  status (active/inactive/down), remarks,
  position_x, position_y,  -- for diagram layout
  created_by, created_at
)

network_edges (
  id, tenant_id, source_node_id, target_node_id,
  connection_type (fiber/utp/wireless/sfp),
  edge_code, color_code, length_m,
  status (active/inactive), remarks, created_by, created_at
)

network_node_clients (
  id, tenant_id, node_id, client_id (FK clients),
  port_no, created_at
)

-- Distributed items: tracks inventory_items deployed at each node
network_node_items (
  id, tenant_id, node_id, inventory_item_id, quantity,
  distributed_by, distributed_at, remarks
)
```

RLS: tenant_id-based, follow existing pattern.

### Pages to build

| Page | Route | Purpose |
|---|---|---|
| Diagram (Tree view) | `/dashboard/network/diagram` | React Flow / d3-tree visualization, right-click menu |
| Network POP | `/dashboard/network/pop` | Virtual node CRUD list |
| Clients in Diagram | `/dashboard/network/clients` | Client→node mapping list |
| Network Connections | `/dashboard/network/connections` | Edge CRUD list |
| Distributed Items | `/dashboard/network/distributed-items` | Items-in-Nodes / Items-in-Edges tabs, PDF/CSV export |
| Network Map | `/dashboard/network/map` | Leaflet map with markers + lines |

### Diagram page (core feature)

- **Library**: `reactflow` (already common in such ERPs; zero conflict)
- **Layout**: Hierarchical tree from root POP → OLT → main splitter → sub splitter → ONU/client
- **Right-click context menu** (matches user screenshot):
  - Go to Root / Go to Parent / View From Root / View From Here
  - Rename node
  - **Add Connection** → opens dialog: select target node + connection type
  - **Assign Items** → opens dialog: select from `inventory_items` (with available stock check from `stock` table). If stock = 0 → show "কিনতে হবে" message + link to Purchase
  - Re-Stock Items / Destroy Item
  - **Add Clients** → multi-select from `clients` table
  - **Geo Location** → lat/long input (auto-syncs to Map page)
  - Remarks/Note / Details / Delete node
- **Add child node**: click `+` on any node → dialog with node_type selector + inventory_item selector
- **EPON/GPON presets**: When adding splitter, dropdown:
  - EPON: 1:8 main → 8× 1:8 sub = 64 ONU
  - GPON: 1:2 → 1:64 / 1:128
  - Auto-creates child placeholder nodes with proper count

### Inventory integration (key requirement)

- "Add component" dialog shows only items where `stock.quantity > 0`
- Selecting an item → decrements stock, creates `network_node_items` row
- If item not in inventory → button "Inventory-এ যোগ করুন" (link to InventoryItems page)
- Categories filter: SFP, Switch, OLT, Splitter, ONU, Cable, Connector

### Map page

- Library: `react-leaflet` + `leaflet` (free, OpenStreetMap, no API key)
- Pull all `network_nodes` with lat/long → markers (color by node_type)
- Pull `network_edges` → polylines between connected nodes
- Click marker → popup with node details + link to diagram view
- "Recenter Map" button + zoom controls

### Files to create/edit

**Migration**: 1 new file (4 tables + RLS + indexes)

**Pages**:
- `src/pages/dashboard/network/Diagram.tsx` (rewrite — React Flow)
- `src/pages/dashboard/network/Map.tsx` (rewrite — Leaflet)
- `src/pages/dashboard/network/DistributedItems.tsx` (rewrite — table + tabs + export)
- `src/pages/dashboard/network/Pop.tsx` (Virtual Nodes CRUD — verify/extend)
- `src/pages/dashboard/network/Connections.tsx` (Edge CRUD — verify/extend)
- `src/pages/dashboard/network/NetworkClients.tsx` (Client→node mapping — verify/extend)

**Components** (new):
- `src/components/network/NodeContextMenu.tsx` — right-click menu
- `src/components/network/AddNodeDialog.tsx` — node creation with EPON/GPON presets
- `src/components/network/AssignItemsDialog.tsx` — inventory picker with stock check
- `src/components/network/AssignClientsDialog.tsx` — client multi-select
- `src/components/network/GeoLocationDialog.tsx` — lat/long input

**Dependencies to add**: `reactflow`, `react-leaflet`, `leaflet`, `@types/leaflet`

### Phased delivery

**Phase 1** (this turn): DB migration + Diagram page (tree view, add/delete nodes, right-click menu, EPON/GPON presets, inventory-linked Add Items, Geo Location)
**Phase 2**: Map page (Leaflet with markers + lines)
**Phase 3**: Pop / Connections / Clients / Distributed Items list pages with filters + PDF/CSV export

Confirm if you want all 3 phases in one go, or Phase 1 first.

