import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PopExpense() {
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    amount: "",
    payment_method: "cash",
    paid_by: "",
    reference: "",
    description: "",
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["pop-expense", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("branch_id", branchId)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch নেই");
      const { error } = await supabase.from("expense_entries").insert({
        branch_id: branchId,
        expense_date: form.expense_date,
        category: form.category || "General",
        amount: Number(form.amount) || 0,
        payment_method: form.payment_method,
        paid_by: form.paid_by || null,
        reference: form.reference || null,
        description: form.description || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Expense যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["pop-expense"] });
      setOpen(false);
      setForm({ expense_date: format(new Date(), "yyyy-MM-dd"), category: "", amount: "", payment_method: "cash", paid_by: "", reference: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["pop-expense"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const total = rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  if (!branchId) return <Card><CardContent className="p-8 text-center text-muted-foreground">Branch assign করা নেই</CardContent></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingDown className="h-6 w-6 text-rose-500" /> Expense</h1>
          <p className="text-sm text-muted-foreground">POP-এর সকল খরচ</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন Expense</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>তারিখ</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Salary, Rent, Internet bill" /></div>
              <div className="space-y-1.5"><Label>Payment Method</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Paid By</Label><Input value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Note</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.amount}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">মোট Expense</div><div className="text-2xl font-bold text-rose-600">৳ {total.toLocaleString()}</div></CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Expense তালিকা</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>তারিখ</TableHead><TableHead>Category</TableHead><TableHead>Method</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">কোনো expense নেই</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.expense_date}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell><Badge variant="secondary">{r.payment_method}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.description || "—"}</TableCell>
                  <TableCell className="text-right font-medium text-rose-600">৳ {Number(r.amount).toLocaleString()}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
