import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Cable } from "lucide-react";
import { CABLE_CORE_COLORS, CABLE_TYPES } from "@/components/network/nodeStyles";
import { Skeleton } from "@/components/ui/skeleton";

interface Row {
  id: string;
  source_node_id: string;
  target_node_id: string;
  cable_type: string | null;
  core_color: string | null;
  core_no: number | null;
  length_m: number | null;
  color_code: string | null;
  start_point: string | null;
  end_point: string | null;
  remarks: string | null;
}

export default function Connections() {
  const [edges, setEdges] = useState<Row[]>([]);
  const [nodes, setNodes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: e }, { data: n }] = await Promise.all([
        supabase.from("network_edges").select("*").order("created_at", { ascending: false }),
        supabase.from("network_nodes").select("id,name"),
      ]);
      setEdges((e as Row[]) || []);
      setNodes(new Map((n || []).map((x: any) => [x.id, x.name])));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return edges;
    const s = q.toLowerCase();
    return edges.filter((e) => {
      const from = (nodes.get(e.source_node_id) || "").toLowerCase();
      const to = (nodes.get(e.target_node_id) || "").toLowerCase();
      return from.includes(s) || to.includes(s) ||
        (e.cable_type || "").toLowerCase().includes(s) ||
        (e.core_color || "").toLowerCase().includes(s);
    });
  }, [edges, nodes, q]);

  const totalLength = filtered.reduce((sum, e) => sum + (e.length_m || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Cable className="h-5 w-5" /> Network Connections / Cable List
        </CardTitle>
        <div className="text-sm">
          <span className="text-muted-foreground">Total cable: </span>
          <span className="font-bold">{totalLength.toLocaleString()} m</span>
        </div>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search by node, cable type, core color..."
          value={q} onChange={(e) => setQ(e.target.value)}
          className="max-w-sm mb-3"
        />
        {loading ? <Skeleton className="h-64" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Cable Type</TableHead>
                <TableHead>Core</TableHead>
                <TableHead>Length (m)</TableHead>
                <TableHead>Start → End</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No cables yet</TableCell></TableRow>
              ) : filtered.map((e) => {
                const cType = CABLE_TYPES.find((c) => c.value === e.cable_type)?.label || e.cable_type || "—";
                const coreHex = CABLE_CORE_COLORS.find((c) => c.name === e.core_color)?.hex || e.color_code || "#94a3b8";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{nodes.get(e.source_node_id) || "—"}</TableCell>
                    <TableCell className="font-medium">{nodes.get(e.target_node_id) || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{cType}</Badge></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-3 w-3 rounded-full border" style={{ background: coreHex }} />
                        {e.core_color || "—"}{e.core_no ? ` #${e.core_no}` : ""}
                      </span>
                    </TableCell>
                    <TableCell>{e.length_m ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.start_point || "—"} → {e.end_point || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{e.remarks || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
