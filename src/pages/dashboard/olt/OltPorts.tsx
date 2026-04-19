import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Network, Wand2, Plus, Trash2 } from "lucide-react";

type PortType = "access_pon" | "uplink_trunk" | "management";

const portTypeColor = (t: string) => {
  if (t === "access_pon") return "default";
  if (t === "uplink_trunk") return "destructive";
  if (t === "management") return "secondary";
  return "outline";
};

const portTypeLabel: Record<string, string> = {
  access_pon: "Access PON",
  uplink_trunk: "Uplink / Trunk",
  management: "Management",
  unknown: "Unknown",
};

export default function OltPorts() {
  const qc = useQueryClient();
  const [oltFilter, setOltFilter] = useState<string>("all");
  const [newPort, setNewPort] = useState({ port_name: "", port_type: "access_pon" as PortType, description: "" });

  const { data: olts = [] } = useQuery({
    queryKey: ["olt-devices-select"],
    queryFn: async () => {
      const { data } = await supabase.from("olt_devices").select("id, name");
      return data || [];
    },
  });

  const { data: ports = [] } = useQuery({
    queryKey: ["olt-ports", oltFilter],
    queryFn: async () => {
      let q = supabase.from("olt_ports").select("*, olt_devices(name)").order("port_name");
      if (oltFilter !== "all") q = q.eq("olt_id", oltFilter);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const { data: macStats = [] } = useQuery({
    queryKey: ["olt-mac-stats", oltFilter],
    queryFn: async () => {
      let q = supabase.from("olt_mac_table").select("olt_id, port, mac");
      if (oltFilter !== "all") q = q.eq("olt_id", oltFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const macCountByPort = useMemo(() => {
    const m = new Map<string, number>();
    macStats.forEach((r: any) => {
      const k = `${r.olt_id}|${r.port}`;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [macStats]);

  const updateMut = useMutation({
    mutationFn: async ({ id, port_type }: { id: string; port_type: PortType }) => {
      const { error } = await supabase.from("olt_ports").update({ port_type }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["olt-ports"] }); toast.success("আপডেট হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      if (oltFilter === "all" || !newPort.port_name) throw new Error("OLT ও Port নাম দিন");
      const { error } = await supabase.from("olt_ports").insert({ ...newPort, olt_id: oltFilter });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["olt-ports"] });
      setNewPort({ port_name: "", port_type: "access_pon", description: "" });
      toast.success("যোগ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("olt_ports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["olt-ports"] }); toast.success("মুছে ফেলা হয়েছে"); },
  });

  const autoDetectMut = useMutation({
    mutationFn: async () => {
      // Heuristic: ports with many MACs from different vendor prefixes → uplink. Single-prefix → access.
      const grouped = new Map<string, Set<string>>(); // olt|port -> set of OUI
      macStats.forEach((r: any) => {
        const key = `${r.olt_id}|${r.port}`;
        const oui = (r.mac || "").toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, 6);
        if (!grouped.has(key)) grouped.set(key, new Set());
        grouped.get(key)!.add(oui);
      });
      const updates: { olt_id: string; port_name: string; port_type: PortType }[] = [];
      grouped.forEach((ouis, key) => {
        const [olt_id, port_name] = key.split("|");
        const macCount = macCountByPort.get(key) || 0;
        // Many distinct OUIs OR very high MAC count → uplink/trunk
        const isUplink = ouis.size >= 5 || macCount >= 50;
        updates.push({ olt_id, port_name, port_type: isUplink ? "uplink_trunk" : "access_pon" });
      });
      // Upsert
      for (const u of updates) {
        await supabase
          .from("olt_ports")
          .upsert(u, { onConflict: "olt_id,port_name" });
      }
      return updates.length;
    },
    onSuccess: (n) => { qc.invalidateQueries({ queryKey: ["olt-ports"] }); toast.success(`${n}টি port classify হয়েছে`); },
    onError: (e: any) => toast.error(e.message),
  });

  const remapMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("map-users-to-onu", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => toast.success(`Mapped: ${d?.mapped || 0}, Ambiguous: ${d?.ambiguous || 0}`),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OLT Port Classification</h1>
          <p className="text-muted-foreground text-sm">
            Trunk topology-তে user-to-ONU সঠিকভাবে map করতে port-গুলোকে Access PON / Uplink হিসেবে চিহ্নিত করুন
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => autoDetectMut.mutate()} disabled={autoDetectMut.isPending}>
            <Wand2 className="h-4 w-4 mr-1" /> Auto-detect
          </Button>
          <Button onClick={() => remapMut.mutate()} disabled={remapMut.isPending}>
            <Network className="h-4 w-4 mr-1" /> Re-map Users
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[220px]">
              <Label>OLT</Label>
              <Select value={oltFilter} onValueChange={setOltFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল OLT</SelectItem>
                  {olts.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {oltFilter !== "all" && (
              <>
                <div>
                  <Label>Port নাম</Label>
                  <Input
                    placeholder="e.g. gpon-olt_0/1/2"
                    value={newPort.port_name}
                    onChange={(e) => setNewPort((p) => ({ ...p, port_name: e.target.value }))}
                    className="w-56"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newPort.port_type} onValueChange={(v) => setNewPort((p) => ({ ...p, port_type: v as PortType }))}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="access_pon">Access PON</SelectItem>
                      <SelectItem value="uplink_trunk">Uplink / Trunk</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !newPort.port_name}>
                  <Plus className="h-4 w-4 mr-1" /> যোগ
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>OLT</TableHead>
                  <TableHead>Port নাম</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>MAC সংখ্যা</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ports.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো port নেই — MAC sync করুন বা manually যোগ করুন</TableCell></TableRow>
                ) : ports.map((p: any, i: number) => {
                  const macCount = macCountByPort.get(`${p.olt_id}|${p.port_name}`) || 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.olt_devices?.name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{p.port_name}</TableCell>
                      <TableCell>
                        <Select value={p.port_type} onValueChange={(v) => updateMut.mutate({ id: p.id, port_type: v as PortType })}>
                          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="access_pon">Access PON</SelectItem>
                            <SelectItem value="uplink_trunk">Uplink / Trunk</SelectItem>
                            <SelectItem value="management">Management</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={portTypeColor(p.port_type) as any}>{macCount}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.description || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("মুছে ফেলবেন?")) delMut.mutate(p.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            💡 <b>Auto-detect</b> করলে যে port-এ ৫+ ভিন্ন vendor prefix বা ৫০+ MAC দেখা যায় সেটা Uplink/Trunk হিসেবে set হবে — বাকি গুলো Access PON।
            Classification ঠিক হলে <b>Re-map Users</b> চাপুন।
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
