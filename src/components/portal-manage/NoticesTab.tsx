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
import { Plus, Edit, Trash2, Pin } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["info", "warning", "success", "event"];

export default function NoticesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", type: "info", pinned: false, active: true });

  const { data: notices } = useQuery({
    queryKey: ["pm-notices"],
    queryFn: async () => {
      const { data } = await supabase.from("client_notices").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.body) throw new Error("Title and body required");
      if (editId) {
        const { error } = await supabase.from("client_notices").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_notices").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-notices"] });
      toast.success("Saved");
      close();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-notices"] });
      toast.success("Deleted");
    },
  });

  const close = () => {
    setOpen(false);
    setEditId(null);
    setForm({ title: "", body: "", type: "info", pinned: false, active: true });
  };

  const edit = (n: any) => {
    setForm({ title: n.title, body: n.body, type: n.type, pinned: n.pinned, active: n.active });
    setEditId(n.id);
    setOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Notices & Announcements</h3>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Notice</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Title</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Pinned</TableHead>
              <TableHead className="text-xs">Active</TableHead>
              <TableHead className="text-xs">Created</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(notices || []).map((n: any, i: number) => (
              <TableRow key={n.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium max-w-xs truncate">{n.title}</TableCell>
                <TableCell className="text-xs"><Badge variant="secondary" className="capitalize">{n.type}</Badge></TableCell>
                <TableCell className="text-xs">{n.pinned && <Pin className="h-3 w-3 text-amber-500" />}</TableCell>
                <TableCell className="text-xs"><Badge variant={n.active ? "default" : "secondary"}>{n.active ? "Yes" : "No"}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(n.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(n)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(n.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!notices?.length && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">No notices yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Notice" : "New Notice"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Body *</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.pinned} onCheckedChange={(v) => setForm((p) => ({ ...p, pinned: v }))} /><Label className="text-xs">Pinned</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} /><Label className="text-xs">Active</Label></div>
              </div>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate()}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
