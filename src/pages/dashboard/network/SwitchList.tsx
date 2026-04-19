import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Plus, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { PermissionGate } from "@/components/PermissionGate";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SwitchList() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", ip_address: "", port: 22, vendor: "cisco",
    snmp_community: "public", snmp_version: "v2c", snmp_port: 161,
    username: "", password_encrypted: "", description: "", model: "",
  });

  const { data: switches = [] } = useQuery({
    queryKey: ["switches-list"],
    queryFn: async () => {
      const { data } = await supabase.from("switches").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const submit = async () => {
    if (!form.name || !form.ip_address) return toast.error("Name এবং IP দিতে হবে");
    const { error } = await supabase.from("switches").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Switch যোগ হয়েছে");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["switches-list"] });
  };

  return (
    <PermissionGate permission="switch.view" showDenied>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Network className="h-6 w-6" /> Switch তালিকা
            </h1>
            <p className="text-sm text-muted-foreground">
              সকল switch device, real-time port status ও SFP power
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Sw Connect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>নতুন Switch যোগ করুন</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>IP *</Label><Input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} /></div>
                <div>
                  <Label>Vendor</Label>
                  <Select value={form.vendor} onValueChange={v => setForm({ ...form, vendor: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cisco">Cisco</SelectItem>
                      <SelectItem value="hp">HP / Aruba</SelectItem>
                      <SelectItem value="huawei">Huawei</SelectItem>
                      <SelectItem value="mikrotik">MikroTik</SelectItem>
                      <SelectItem value="tp-link">TP-Link</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Model</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
                <div><Label>SSH Port</Label><Input type="number" value={form.port} onChange={e => setForm({ ...form, port: +e.target.value })} /></div>
                <div><Label>SNMP Port</Label><Input type="number" value={form.snmp_port} onChange={e => setForm({ ...form, snmp_port: +e.target.value })} /></div>
                <div><Label>SNMP Community</Label><Input value={form.snmp_community} onChange={e => setForm({ ...form, snmp_community: e.target.value })} /></div>
                <div>
                  <Label>SNMP Version</Label>
                  <Select value={form.snmp_version} onValueChange={v => setForm({ ...form, snmp_version: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v1">v1</SelectItem>
                      <SelectItem value="v2c">v2c</SelectItem>
                      <SelectItem value="v3">v3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Username</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
                <div><Label>Password</Label><Input type="password" value={form.password_encrypted} onChange={e => setForm({ ...form, password_encrypted: e.target.value })} /></div>
                <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
                <Button onClick={submit}>যোগ করুন</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Switches ({switches.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {switches.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">কোনো switch নেই</TableCell></TableRow>
                ) : switches.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.ip_address}</TableCell>
                    <TableCell>{s.vendor || "—"}</TableCell>
                    <TableCell>{s.model || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "online" ? "default" : "destructive"}>
                        {s.status === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{s.last_synced ? new Date(s.last_synced).toLocaleString("bn-BD") : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/dashboard/network/switches/${s.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
}
