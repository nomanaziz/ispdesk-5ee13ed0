import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { styleOf } from "./nodeStyles";

interface MapNode {
  id: string;
  name: string;
  node_type: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
}
interface MapEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  color_code?: string | null;
  cable_type?: string | null;
  length_m?: number | null;
}

interface Props {
  nodes: MapNode[];
  edges: MapEdge[];
  height?: number;
  onNodeClick?: (id: string) => void;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [points, map]);
  return null;
}

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -18],
  });
}

export function NetworkMap({ nodes, edges, height = 600, onNodeClick }: Props) {
  const geoNodes = useMemo(
    () => nodes.filter((n): n is MapNode & { latitude: number; longitude: number } =>
      n.latitude != null && n.longitude != null
    ),
    [nodes],
  );

  const points: [number, number][] = geoNodes.map((n) => [Number(n.latitude), Number(n.longitude)]);
  const center: [number, number] = points[0] || [23.685, 90.356]; // Bangladesh fallback

  const lookup = new Map(geoNodes.map((n) => [n.id, n]));
  const linePolylines = edges
    .map((e) => {
      const a = lookup.get(e.source_node_id);
      const b = lookup.get(e.target_node_id);
      if (!a || !b) return null;
      return {
        id: e.id,
        positions: [
          [Number(a.latitude), Number(a.longitude)],
          [Number(b.latitude), Number(b.longitude)],
        ] as [number, number][],
        color: e.color_code || "#64748B",
        type: e.cable_type || "fiber",
        length: e.length_m,
      };
    })
    .filter(Boolean) as { id: string; positions: [number, number][]; color: string; type: string; length: number | null }[];

  return (
    <div style={{ height }} className="rounded-md overflow-hidden border">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {linePolylines.map((p) => (
          <Polyline key={p.id} positions={p.positions} pathOptions={{ color: p.color, weight: 4, opacity: 0.85 }}>
            <Popup>
              <div className="text-xs">
                <div><strong>Type:</strong> {p.type}</div>
                {p.length != null && <div><strong>Length:</strong> {p.length} m</div>}
              </div>
            </Popup>
          </Polyline>
        ))}
        {geoNodes.map((n) => {
          const s = styleOf(n.node_type);
          return (
            <Marker
              key={n.id}
              position={[Number(n.latitude), Number(n.longitude)]}
              icon={makeIcon(s.color)}
              eventHandlers={{ click: () => onNodeClick?.(n.id) }}
            >
              <Popup>
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">{n.name}</div>
                  <div className="opacity-70 uppercase text-[10px]">{s.label}</div>
                  {n.address && <div className="opacity-80">{n.address}</div>}
                  <div className="font-mono opacity-60">{Number(n.latitude).toFixed(5)}, {Number(n.longitude).toFixed(5)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {geoNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-sm text-muted-foreground bg-background/60">
          কোনো node-এ lat/long নেই — diagram-এ right-click করে geo location দিন
        </div>
      )}
    </div>
  );
}
