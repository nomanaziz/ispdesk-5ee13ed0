
# Plan: Interactive Network Diagram (Offline Map + Color-coded Topology)

## Goal
Network module কে এমন বানানো যাতে একজন technician canvas-এ click করে server room → SFP → patch cord → ODF → TJ box → cable → splitter → client (home) — পুরো physical fiber path তৈরি করতে পারে, প্রত্যেক entity-র আলাদা color/icon থাকবে, lat/long দিলে offline map-এ ওই point-গুলো দেখাবে এবং fiber link-গুলো রাস্তার মতো connect হবে। নতুন client account খোলা মাত্র সেটা automatically related MikroTik/OLT node-এর under-এ diagram-এ চলে আসবে।

## Pages — কী রাখব, কী সরাব

| Page | Action |
|---|---|
| `Diagram.tsx` | পুরো rewrite — interactive editor (palette + canvas + map view toggle) |
| `Map.tsx` | পুরো rewrite — Leaflet-based offline-capable map view |
| `NetworkClients.tsx` | Implement — diagram-এ থাকা সব client list + filter + jump-to-node |
| `Connections.tsx` | Implement — সব edge (cable/patch cord) tabular view + cable length report |
| `DistributedItems.tsx` | Implement — কোন node-এ কোন inventory item (SFP, patch cord, splitter) আছে |
| `SwitchList.tsx` / `SwitchDetail.tsx` / `Pop.tsx` | Keep as-is |

## Entity Types & Colors (legend)

| Entity | node_type | Color | Icon |
|---|---|---|---|
| Server / Server Room | `server_room` | Indigo `#4F46E5` | server |
| Switch / Router | `switch` / `router` | Purple / Pink | network |
| SFP module | `sfp` | Cyan `#06B6D4` | zap |
| Patch Cord | (edge `patch_cord`) | Teal `#14B8A6` | line |
| ODF | `odf` | Amber `#F59E0B` | grid |
| TJ Box | `tj_box` | **Black `#111827`** | box |
| Main Splitter 1:8 | `splitter_main` | Orange `#F97316` | split |
| Sub Splitter | `splitter_sub` | Yellow `#EAB308` | split |
| OLT | `olt` | Blue `#2563EB` | server |
| ONU | `onu` | Green `#10B981` | radio |
| Client (home) | `client` | Rose `#E11D48` | **home** |
| Fiber Cable (edge) | `fiber` | Slate `#64748B` (with 7 core colors) | line |

**Cable core colors** (industry standard, max 7): Blue, Orange, Green, Brown, Slate, White, Red — edge-এর `color_code` field-এ store হবে, line-এ ওই color show করবে।

## DB Migration (small, additive)

```sql
-- network_nodes: extra fields
ALTER TABLE public.network_nodes
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS color text;

-- network_edges: cable details
ALTER TABLE public.network_edges
  ADD COLUMN IF NOT EXISTS core_color text,    -- blue/orange/green/...
  ADD COLUMN IF NOT EXISTS core_no integer,
  ADD COLUMN IF NOT EXISTS cable_type text,    -- fiber / patch_cord / drop_cable
  ADD COLUMN IF NOT EXISTS start_point text,
  ADD COLUMN IF NOT EXISTS end_point text;

-- Allowed node_type expand (no enum — text already)
-- Existing values stay valid.

-- Auto-create client node when a client is added/updated with lat/long + onu/mikrotik
CREATE OR REPLACE FUNCTION public.sync_client_to_network_diagram()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_parent uuid;
  v_node uuid;
BEGIN
  -- find parent: ONU node first, else MikroTik node, else branch root
  IF NEW.onu_id IS NOT NULL THEN
    SELECT id INTO v_parent FROM public.network_nodes
      WHERE node_type='onu' AND serial_number = NEW.onu_id::text LIMIT 1;
  END IF;
  IF v_parent IS NULL AND NEW.mikrotik_id IS NOT NULL THEN
    SELECT id INTO v_parent FROM public.network_nodes
      WHERE node_type IN ('router','switch','olt') AND inventory_item_id = NEW.mikrotik_id LIMIT 1;
  END IF;

  -- upsert client node
  SELECT id INTO v_node FROM public.network_nodes
    WHERE node_type='client' AND remarks = NEW.id::text LIMIT 1;

  IF v_node IS NULL THEN
    INSERT INTO public.network_nodes(name, node_type, parent_id, latitude, longitude,
       address, status, branch_id, remarks, color, icon)
    VALUES (NEW.name, 'client', v_parent,
       NULLIF(NEW.latitude,'')::numeric, NULLIF(NEW.longitude,'')::numeric,
       NEW.address, COALESCE(NEW.status,'active'), NEW.branch_id, NEW.id::text,
       '#E11D48','home')
    RETURNING id INTO v_node;
  ELSE
    UPDATE public.network_nodes SET
      name=NEW.name, parent_id=COALESCE(v_parent,parent_id),
      latitude=NULLIF(NEW.latitude,'')::numeric,
      longitude=NULLIF(NEW.longitude,'')::numeric,
      address=NEW.address, status=COALESCE(NEW.status,status)
    WHERE id=v_node;
  END IF;

  -- edge from parent → client
  IF v_parent IS NOT NULL THEN
    INSERT INTO public.network_edges(source_node_id,target_node_id,connection_type,
       cable_type,length_m,color_code,core_color)
    SELECT v_parent, v_node, 'fiber','drop_cable',NEW.cable_length,'#64748B',NEW.core_color
    WHERE NOT EXISTS (
      SELECT 1 FROM public.network_edges
      WHERE source_node_id=v_parent AND target_node_id=v_node);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_client_to_diagram
AFTER INSERT OR UPDATE OF name,address,latitude,longitude,onu_id,mikrotik_id,cable_length
ON public.clients FOR EACH ROW EXECUTE FUNCTION public.sync_client_to_network_diagram();
```

## Diagram Editor (`Diagram.tsx`)

Three-pane layout:

```text
┌─────────────┬──────────────────────────────┬──────────────┐
│  Palette    │   Canvas / Map (toggle)      │  Inspector   │
│  ─ Server   │                              │  Selected    │
│  ─ Switch   │   [React Flow nodes/edges]   │  node/edge   │
│  ─ SFP      │   OR                         │  details +   │
│  ─ ODF      │   [Leaflet map w/ markers]   │  edit form   │
│  ─ TJ Box   │                              │              │
│  ─ Splitter │                              │  Cable:      │
│  ─ ONU      │                              │   length,    │
│  ─ Client   │                              │   core color │
│  ─ Cable    │                              │   start/end  │
└─────────────┴──────────────────────────────┴──────────────┘
```

Features:
- Drag-from-palette OR right-click canvas → "Add node here" (uses click coords)
- Right-click any node → Add child / Edit / Delete / Set Geo / Assign Items
- Click two nodes + "Connect" button → opens cable dialog (length, type, core color/no, start/end)
- View toggle: **Schematic** (React Flow) ↔ **Map** (Leaflet, offline tiles)
- Color legend always visible
- Filter: by node_type, by branch (POP)

## Offline Map (`Map.tsx` + map view in Diagram)

- **Library**: `react-leaflet` + `leaflet` (already-friendly with Vite)
- **Offline strategy**: 
  - Default tiles from OpenStreetMap (online when available)
  - Cache tiles in browser via Service Worker (`leaflet.offline` package) — first load caches visited area, subsequent loads work without internet
  - Fallback: blank grid background with just markers + lines (works fully offline immediately)
- Markers colored per entity type, popup shows node name + type + assigned items
- Polylines between connected nodes follow lat/long, colored by cable core color
- Click marker → opens same Inspector as schematic view

## Auto-link Logic (no extra UI work for technician)

When a client is created in `clients` table:
1. Trigger fires → finds the client's ONU (`onu_id`) or MikroTik (`mikrotik_id`)
2. Creates/updates a `network_nodes` row of type `client` with the client's lat/long
3. Auto-creates an edge from parent (ONU/router) → client
4. If ONU itself is missing in diagram, falls back to MikroTik node; if both missing, node sits unparented and shows up in "Unlinked clients" filter so admin can drag it onto the right OLT/PON.

This means: **technician just adds the client in normal client form → diagram updates itself**. No double entry.

## Connections page (`Connections.tsx`)

Table of all `network_edges` joined with source/target nodes:
- Columns: From → To, Cable Type, Length (m), Core Color (swatch), Core No, Status, Remarks
- Filter by node, by branch, by core color
- Total cable length summary card
- Export CSV

## Distributed Items page (`DistributedItems.tsx`)

Pulls `network_node_items` joined with `inventory_items` and `network_nodes`:
- Columns: Node, Item Name, Quantity, Category (SFP/Patch cord/Splitter/etc.), Assigned Date
- Filter by category, by node, by branch
- Quick "remove from node" action

## Network Clients page (`NetworkClients.tsx`)

Lists all `network_nodes` of type `client`:
- Columns: Client Name, Parent (ONU/Switch), Cable Length, Online status, Lat/Long, Action (jump to diagram)
- Search + branch filter
- Highlights "Unlinked" clients (no parent)

## Files to be modified / created

**Modify**
- `src/pages/dashboard/network/Diagram.tsx`
- `src/pages/dashboard/network/Map.tsx`
- `src/pages/dashboard/network/Connections.tsx`
- `src/pages/dashboard/network/DistributedItems.tsx`
- `src/pages/dashboard/network/NetworkClients.tsx`
- `src/components/network/AddNodeDialog.tsx` (add new node types + color/icon)

**Create**
- `src/components/network/NodePalette.tsx`
- `src/components/network/NodeInspector.tsx`
- `src/components/network/EdgeDialog.tsx` (cable details: length, type, core color, core no, start/end)
- `src/components/network/NetworkMap.tsx` (Leaflet wrapper, offline tile cache)
- `src/components/network/nodeStyles.ts` (color/icon registry — single source of truth)
- DB migration for the columns + trigger above

**Dependencies to install**
- `leaflet`, `react-leaflet`, `@types/leaflet`
- `leaflet.offline` (for tile caching) — optional; if it doesn't play well with Vite we'll fall back to a tiny custom service worker

## Out of scope (skipped intentionally)
- 3D / GIS road-routing
- Real-time fiber loss calculation
- Auto-routing of edges around obstacles on the map

## Open question
Map default centre: I'll use the user's first POP `address`/lat-long if available, else Bangladesh centre (`23.685, 90.356`). Acceptable?
