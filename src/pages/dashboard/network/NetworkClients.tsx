import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, ExternalLink, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NetworkClients() {
  const [rows, setRows] = useState<any[]>([]);
  const [parents, setParents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "linked" | "unlinked">("all");

  useEffect(() => {
    (async () => {
      const { data: clientNodes } = await supabase
        .from("network_nodes")
        .select("id,name,parent_id,latitude,longitude,address,status,remarks")
        .eq("node_type", "client")
        .order("name");
      const { data: allNodes } = await supabase
        .from("network_nodes").select("id,name");
      setParents(new Map((allNodes || []).map((n: any) => [n.id, n.name])));
      setRows(clientNodes || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "linked" && !r.parent_id) return false;
      if (filter === "unlinked" && r.parent_id) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        if (!(r.name || "").toLowerCase().includes(s) && !(r.address || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rows, q, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" /> Clients in Diagram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search client / address..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <div className="flex gap-1">
            {(["all", "linked", "unlinked"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "linked" ? "Linked" : "Unlinked"}
              </Button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground self-center">{filtered.length} client(s)</div>
        </div>
        {loading ? <Skeleton className="h-64" /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Connected Under</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Lat / Long</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No clients in diagram</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.parent_id ? (parents.get(r.parent_id) || "—") : <Badge variant="destructive">Unlinked</Badge>}</TableCell>
                  <TableCell className="text-xs">{r.address || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.latitude && r.longitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : "—"}
                  </TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status || "—"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/dashboard/network/diagram">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Diagram
                      </Link>
                    </Button>
                    {r.latitude && r.longitude && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/dashboard/network/map"><MapPin className="h-3.5 w-3.5" /></Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
