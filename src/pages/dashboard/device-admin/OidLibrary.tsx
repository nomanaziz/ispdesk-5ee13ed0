import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Lock, Search, Loader2 } from "lucide-react";

type Profile = {
  id: string;
  vendor_key: string;
  display_name: string;
  device_category: string;
  is_system: boolean;
  notes: string | null;
};

type Mapping = {
  id: string;
  profile_id: string;
  metric_key: string;
  oid: string;
  oid_type: string;
  value_transform: string | null;
  description: string | null;
};

const METRIC_KEYS = [
  "system_name", "system_descr", "system_uptime",
  "cpu_usage", "memory_usage", "temperature",
  "onu_rx_power", "onu_tx_power", "onu_status",
  "onu_distance", "onu_serial", "onu_mac",
  "port_admin_status", "port_oper_status",
  "mac_fdb", "interface_in_octets", "interface_out_octets",
];

export default function OidLibrary() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileDlg, setProfileDlg] = useState<{ open: boolean; mode: "new" | "clone"; from?: Profile } | null>(null);
  const [mappingDlg, setMappingDlg] = useState<{ open: boolean; mapping: Partial<Mapping> | null } | null>(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["device_vendor_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_vendor_profiles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("display_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const filtered = profiles.filter((p) =>
    !search || p.display_name.toLowerCase().includes(search.toLowerCase()) || p.vendor_key.includes(search.toLowerCase()),
  );

  const selected = profiles.find((p) => p.id === selectedId) || filtered[0];

  const { data: mappings = [] } = useQuery({
    queryKey: ["device_oid_mappings", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_oid_mappings")
        .select("*")
        .eq("profile_id", selected!.id)
        .order("metric_key");
      if (error) throw error;
      return data as Mapping[];
    },
  });

  const createProfile = useMutation({
    mutationFn: async (form: { vendor_key: string; display_name: string; device_category: string; notes: string; cloneFrom?: string }) => {
      const { data: p, error } = await supabase
        .from("device_vendor_profiles")
        .insert({
          vendor_key: form.vendor_key,
          display_name: form.display_name,
          device_category: form.device_category,
          notes: form.notes,
          is_system: false,
        })
        .select()
        .single();
      if (error) throw error;
      if (form.cloneFrom) {
        const { data: src } = await supabase.from("device_oid_mappings").select("*").eq("profile_id", form.cloneFrom);
        if (src && src.length) {
          await supabase.from("device_oid_mappings").insert(
            src.map((m) => ({
              profile_id: p.id,
              metric_key: m.metric_key,
              oid: m.oid,
              oid_type: m.oid_type,
              value_transform: m.value_transform,
              description: m.description,
            })),
          );
        }
      }
      return p;
    },
    onSuccess: (p: any) => {
      toast.success("Profile তৈরি হয়েছে");
      qc.invalidateQueries({ queryKey: ["device_vendor_profiles"] });
      setSelectedId(p.id);
      setProfileDlg(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_vendor_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile ডিলিট হয়েছে");
      qc.invalidateQueries({ queryKey: ["device_vendor_profiles"] });
      setSelectedId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMapping = useMutation({
    mutationFn: async (m: Partial<Mapping>) => {
      if (m.id) {
        const { error } = await supabase.from("device_oid_mappings").update({
          metric_key: m.metric_key, oid: m.oid, oid_type: m.oid_type,
          value_transform: m.value_transform || null, description: m.description || null,
        }).eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("device_oid_mappings").insert({
          profile_id: selected!.id,
          metric_key: m.metric_key!, oid: m.oid!, oid_type: m.oid_type || "scalar",
          value_transform: m.value_transform || null, description: m.description || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("সেভ হয়েছে");
      qc.invalidateQueries({ queryKey: ["device_oid_mappings", selected?.id] });
      setMappingDlg(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_oid_mappings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ডিলিট হয়েছে");
      qc.invalidateQueries({ queryKey: ["device_oid_mappings", selected?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canEdit = selected && !selected.is_system;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">OID Library</h1>
          <p className="text-sm text-muted-foreground">Vendor অনুযায়ী SNMP OID profile manage করুন</p>
        </div>
        <Button onClick={() => setProfileDlg({ open: true, mode: "new" })}>
          <Plus className="size-4 mr-1.5" /> নতুন Profile
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-4">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Profile খুঁজুন" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
            {isLoading && <div className="p-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-1.5" /> লোড হচ্ছে…</div>}
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-2.5 rounded-md hover:bg-accent flex items-center justify-between ${selected?.id === p.id ? "bg-accent" : ""}`}
              >
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {p.display_name}
                    {p.is_system && <Lock className="size-3 text-muted-foreground" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.vendor_key}</div>
                </div>
                <Badge variant="outline" className="text-xs">{p.device_category}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-8">
          {!selected ? (
            <CardContent className="p-10 text-center text-muted-foreground">Profile সিলেক্ট করুন</CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selected.display_name}
                      {selected.is_system && <Badge variant="secondary"><Lock className="size-3 mr-1" /> System</Badge>}
                    </CardTitle>
                    {selected.notes && <p className="text-sm text-muted-foreground mt-1">{selected.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setProfileDlg({ open: true, mode: "clone", from: selected })}>
                      <Copy className="size-4 mr-1.5" /> Clone
                    </Button>
                    {canEdit && (
                      <Button variant="destructive" size="sm" onClick={() => confirm("Profile ডিলিট করবেন?") && deleteProfile.mutate(selected.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                    <Button size="sm" disabled={!canEdit} onClick={() => setMappingDlg({ open: true, mapping: { oid_type: "scalar" } })}>
                      <Plus className="size-4 mr-1.5" /> OID যোগ
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>OID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Transform</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">কোনো OID নাই</TableCell></TableRow>
                    )}
                    {mappings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium text-sm">{m.metric_key}</TableCell>
                        <TableCell className="font-mono text-xs">{m.oid}</TableCell>
                        <TableCell><Badge variant="outline">{m.oid_type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.value_transform || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => setMappingDlg({ open: true, mapping: m })}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => confirm("ডিলিট করবেন?") && deleteMapping.mutate(m.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {profileDlg?.open && (
        <ProfileDialog
          mode={profileDlg.mode}
          cloneFrom={profileDlg.from}
          onClose={() => setProfileDlg(null)}
          onSave={(f) => createProfile.mutate({ ...f, cloneFrom: profileDlg.from?.id })}
          saving={createProfile.isPending}
        />
      )}

      {mappingDlg?.open && (
        <MappingDialog
          mapping={mappingDlg.mapping!}
          onClose={() => setMappingDlg(null)}
          onSave={(m) => saveMapping.mutate(m)}
          saving={saveMapping.isPending}
        />
      )}
    </div>
  );
}

function ProfileDialog({ mode, cloneFrom, onClose, onSave, saving }: any) {
  const [form, setForm] = useState({
    vendor_key: cloneFrom ? `${cloneFrom.vendor_key}_copy` : "",
    display_name: cloneFrom ? `${cloneFrom.display_name} (copy)` : "",
    device_category: cloneFrom?.device_category || "olt",
    notes: cloneFrom?.notes || "",
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "clone" ? "Profile Clone" : "নতুন Profile"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Vendor key * (unique, lowercase)</Label>
            <Input value={form.vendor_key} onChange={(e) => setForm({ ...form, vendor_key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="my_custom_olt" />
          </div>
          <div className="space-y-1.5">
            <Label>Display name *</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Device category</Label>
            <Select value={form.device_category} onValueChange={(v) => setForm({ ...form, device_category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="olt">OLT</SelectItem>
                <SelectItem value="router">Router</SelectItem>
                <SelectItem value="switch">Switch</SelectItem>
                <SelectItem value="onu">ONU</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>বাতিল</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.vendor_key || !form.display_name}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "সেভ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MappingDialog({ mapping, onClose, onSave, saving }: any) {
  const [form, setForm] = useState<any>({
    id: mapping.id,
    metric_key: mapping.metric_key || "",
    oid: mapping.oid || "",
    oid_type: mapping.oid_type || "scalar",
    value_transform: mapping.value_transform || "",
    description: mapping.description || "",
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mapping.id ? "OID Edit" : "নতুন OID"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Metric key *</Label>
            <Select value={form.metric_key} onValueChange={(v) => setForm({ ...form, metric_key: v })}>
              <SelectTrigger><SelectValue placeholder="মেট্রিক সিলেক্ট করুন" /></SelectTrigger>
              <SelectContent>
                {METRIC_KEYS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>OID *</Label>
            <Input className="font-mono" value={form.oid} onChange={(e) => setForm({ ...form, oid: e.target.value })} placeholder="1.3.6.1.2.1.1.5.0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.oid_type} onValueChange={(v) => setForm({ ...form, oid_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scalar">scalar (get)</SelectItem>
                  <SelectItem value="walk">walk</SelectItem>
                  <SelectItem value="table">table</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transform</Label>
              <Input value={form.value_transform} onChange={(e) => setForm({ ...form, value_transform: e.target.value })} placeholder="divide:10, dbm_signed_div100, hex_to_mac" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>বাতিল</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.metric_key || !form.oid}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "সেভ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
