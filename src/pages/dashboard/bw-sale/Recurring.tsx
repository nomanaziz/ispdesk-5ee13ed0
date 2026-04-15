import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function Recurring() {
  const [items, setItems] = useState<any[]>([]);
  const [pops, setPops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ pop_id: "", start_date: "", end_date: "", repeat_date: 30, status: "enabled", bill_amount: 0 });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [rRes, pRes] = await Promise.all([
      supabase.from("bw_sale_recurring").select("*").order("created_at", { ascending: false }),
      supabase.from("bw_sale_pops").select("*").order("name"),
    ]);
    if (rRes.data) setItems(rRes.data);
    if (pRes.data) setPops(pRes.data);
    setLoading(false);
  }

  const totalBill = items.reduce((s, i) => s + (i.bill_amount || 0), 0);

  function openAdd() {
    setEditId(null);
    setForm({ pop_id: "", start_date: "", end_date: "", repeat_date: 30, status: "enabled", bill_amount: 0 });
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditId(item.id);
    setForm({ pop_id: item.pop_id || "", start_date: item.start_date || "", end_date: item.end_date || "", repeat_date: item.repeat_date || 30, status: item.status, bill_amount: item.bill_amount || 0 });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload: any = { ...form };
    if (!payload.pop_id) payload.pop_id = null;
    if (!payload.start_date) payload.start_date = null;
    if (!payload.end_date) payload.end_date = null;

    if (editId) {
      const { error } = await supabase.from("bw_sale_recurring").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("bw_sale_recurring").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    const { error } = await supabase.from("bw_sale_recurring").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); fetchData(); }
  }

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
          <CardTitle className="text-lg">Recurring Invoices</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Invoice</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">SN</TableHead>
                  <TableHead>POP Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Repeat (Days)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bill Amount</TableHead>
                  <TableHead className="w-24 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No recurring invoices</TableCell></TableRow>
                ) : items.map((item, i) => (
                  <TableRow key={item.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{pops.find(p => p.id === item.pop_id)?.name || "—"}</TableCell>
                    <TableCell>{item.start_date || "—"}</TableCell>
                    <TableCell>{item.end_date || "—"}</TableCell>
                    <TableCell>{item.repeat_date}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "enabled" ? "default" : "secondary"}>{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">৳{(item.bill_amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length > 0 && (
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={6} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">৳{totalBill.toLocaleString()}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Recurring Invoice</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>POP</Label>
              <Select value={form.pop_id} onValueChange={v => set("pop_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select POP" /></SelectTrigger>
                <SelectContent>{pops.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} /></div>
            </div>
            <div><Label>Repeat Date (Days)</Label><Input type="number" value={form.repeat_date} onChange={e => set("repeat_date", Number(e.target.value))} /></div>
            <div><Label>Bill Amount</Label><Input type="number" value={form.bill_amount} onChange={e => set("bill_amount", Number(e.target.value))} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editId ? "Update" : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
