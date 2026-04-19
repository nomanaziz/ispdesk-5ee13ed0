import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

const PERMISSION_KEYS = [
  { key: "olt.dashboard.view", label: "OLT Power Dashboard দেখা" },
  { key: "olt.onu.view", label: "ONU details দেখা" },
  { key: "switch.view", label: "Switch তালিকা দেখা" },
  { key: "switch.port.toggle", label: "Switch port on/off" },
  { key: "switch.port.edit", label: "Switch port description/VLAN edit" },
  { key: "switch.vlan.manage", label: "Switch VLAN add/delete" },
  { key: "switch.traffic.view", label: "Live traffic monitor" },
];

export default function DevicePermissions() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ user_id: "", permission_key: "olt.dashboard.view", scope: "all", scope_id: "" });

  const { data: rows = [] } = useQuery({
    queryKey: ["device-permissions-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("device_permissions")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const grant = async () => {
    if (!form.user_id || !form.permission_key) return toast.error("User ও permission key দিতে হবে");
    const payload: any = {
      user_id: form.user_id,
      permission_key: form.permission_key,
      scope: form.scope,
      scope_id: form.scope === "all" ? null : form.scope_id || null,
    };
    const { error } = await supabase.from("device_permissions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Permission যোগ হয়েছে");
    qc.invalidateQueries({ queryKey: ["device-permissions-list"] });
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("device_permissions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    qc.invalidateQueries({ queryKey: ["device-permissions-list"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> Device Permissions
        </h1>
        <p className="text-sm text-muted-foreground">
          User-কে নির্দিষ্ট device action এর অনুমতি দিন। Admin/Super admin সবসময় সব অনুমতি পায়।
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>নতুন Permission Grant</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label>User ID (auth.users.id)</Label>
            <Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} placeholder="UUID" />
          </div>
          <div>
            <Label>Permission</Label>
            <Select value={form.permission_key} onValueChange={(v) => setForm({ ...form, permission_key: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERMISSION_KEYS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="device">Specific Device</SelectItem>
                <SelectItem value="branch">Branch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope ID</Label>
            <Input
              value={form.scope_id}
              onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
              disabled={form.scope === "all"}
              placeholder="device or branch UUID"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={grant} className="w-full">Grant</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Grants ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Scope ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                  <TableCell><Badge variant="outline">{r.permission_key}</Badge></TableCell>
                  <TableCell><Badge>{r.scope}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.scope_id || "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("bn-BD")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => revoke(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">কোনো grant নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
