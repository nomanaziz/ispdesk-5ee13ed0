import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { v: "live_tv", label: "Live TV" },
  { v: "ftp", label: "FTP" },
  { v: "movie", label: "Movie" },
  { v: "iptv", label: "IPTV" },
  { v: "other", label: "Other" },
];

export default function MediaServersTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", type: "ftp", description: "", username: "", password: "", active: true, sort_order: 0 });

  const { data } = useQuery({
    queryKey: ["pm-media"],
    queryFn: async () => {
      const { data } = await supabase.from("media_servers").select("*").order("sort_order").order("created_at");
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.url) throw new Error("Name and URL required");
      if (editId) {
        const { error } = await supabase.from("media_servers").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("media_servers").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-media"] }); toast.success("Saved"); close(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_servers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-media"] }); toast.success("Deleted"); },
  });

  const close = () => { setOpen(false); setEditId(null); setForm({ name: "", url: "", type: "ftp", description: "", username: "", password: "", active: true, sort_order: 0 }); };
  const edit = (s: any) => { setForm({ name: s.name, url: s.url, type: s.type, description: s.description || "", username: s.username || "", password: s.password || "", active: s.active, sort_order: s.sort_order || 0 }); setEditId(s.id); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Media Servers (Live TV / FTP / Movies)</h3>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Server</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">URL</TableHead>
              <TableHead className="text-xs">Active</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((s: any, i: number) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium">{s.name}</TableCell>
                <TableCell className="text-xs"><Badge variant="secondary" className="capitalize">{s.type?.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs max-w-xs truncate"><a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.url}</a></TableCell>
                <TableCell className="text-xs"><Badge variant={s.active ? "default" : "secondary"}>{s.active ? "Yes" : "No"}</Badge></TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(s)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No servers yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Server" : "New Server"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>URL *</Label><Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="ftp://… or https://…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} /></div>
              <div><Label>Password</Label><Input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} /><Label className="text-xs">Active</Label></div>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate()}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
