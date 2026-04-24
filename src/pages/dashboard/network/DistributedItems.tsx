import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Boxes } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { styleOf } from "@/components/network/nodeStyles";

export default function DistributedItems() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("network_node_items")
        .select(`
          id, quantity, distributed_at, node_id, inventory_item_id,
          network_nodes(name, node_type),
          inventory_items(name, code)
        `)
        .order("distributed_at", { ascending: false });
      if (error) { setLoading(false); return; }
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) =>
      (r.network_nodes?.name || "").toLowerCase().includes(s) ||
      (r.inventory_items?.name || "").toLowerCase().includes(s) ||
      (r.inventory_items?.code || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="h-5 w-5" /> Distributed Inventory Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search by node / item / category..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        {loading ? <Skeleton className="h-64" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Assigned to Node</TableHead>
                <TableHead>Node Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No distributed items</TableCell></TableRow>
              ) : filtered.map((r) => {
                const s = styleOf(r.network_nodes?.node_type);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.inventory_items?.name || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.inventory_items?.code || "—"}</TableCell>
                    <TableCell>{r.network_nodes?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge style={{ background: s.color, color: "white" }}>{s.label}</Badge>
                    </TableCell>
                    <TableCell>{r.quantity ?? 1}</TableCell>
                    <TableCell className="text-xs">{r.distributed_at ? new Date(r.distributed_at).toLocaleDateString("bn-BD") : "—"}</TableCell>
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
