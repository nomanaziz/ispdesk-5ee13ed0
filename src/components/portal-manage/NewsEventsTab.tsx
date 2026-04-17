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

export default function NewsEventsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", details: "", photo_url: "", type: "news", event_date: "", active: true });

  const { data } = useQuery({
    queryKey: ["pm-news"],
    queryFn: async () => {
      const { data } = await supabase.from("client_news_events").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const payload = { ...form, event_date: form.event_date || null, photo_url: form.photo_url || null, details: form.details || null };
      if (editId) {
        const { error } = await supabase.from("client_news_events").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_news_events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-news"] }); toast.success("Saved"); close(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_news_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-news"] }); toast.success("Deleted"); },
  });

  const close = () => { setOpen(false); setEditId(null); setForm({ title: "", details: "", photo_url: "", type: "news", event_date: "", active: true }); };
  const edit = (n: any) => { setForm({ title: n.title, details: n.details || "", photo_url: n.photo_url || "", type: n.type, event_date: n.event_date || "", active: n.active }); setEditId(n.id); setOpen(true); };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">News & Events</h3>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Title</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Event Date</TableHead>
              <TableHead className="text-xs">Active</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((n: any, i: number) => (
              <TableRow key={n.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs font-medium max-w-xs truncate">{n.title}</TableCell>
                <TableCell className="text-xs"><Badge variant="secondary" className="capitalize">{n.type}</Badge></TableCell>
                <TableCell className="text-xs">{n.event_date ? new Date(n.event_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-xs"><Badge variant={n.active ? "default" : "secondary"}>{n.active ? "Yes" : "No"}</Badge></TableCell>
                <TableCell className="text-xs">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => edit(n)}><Edit className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(n.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!data?.length && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">No items yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "New"} News / Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="news">News</SelectItem><SelectItem value="event">Event</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Event Date</Label><Input type="date" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} /></div>
            </div>
            <div><Label>Photo URL</Label><Input value={form.photo_url} onChange={(e) => setForm((p) => ({ ...p, photo_url: e.target.value }))} /></div>
            <div><Label>Details</Label><Textarea rows={4} value={form.details} onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm((p) => ({ ...p, active: v }))} /><Label className="text-xs">Active</Label></div>
            <Button className="w-full" onClick={() => upsert.mutate()}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
