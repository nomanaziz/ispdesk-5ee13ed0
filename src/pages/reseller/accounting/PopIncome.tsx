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
import { Plus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PopIncome() {
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    income_date: format(new Date(), "yyyy-MM-dd"),
    source: "",
    amount: "",
    payment_method: "cash",
    reference: "",
    description: "",
  });

  const { data: manual = [] } = useQuery({
    queryKey: ["pop-income", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income_entries")
        .select("*")
        .eq("branch_id", branchId)
        .order("income_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["pop-bill-collections", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      // bill_collections joined via clients.branch_id
      const { data, error } = await supabase
        .from("bill_collections")
        .select("id, amount, payment_method, transaction_id, created_at, client_id, clients!inner(name, branch_id)")
        .eq("clients.branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch নেই");
      const { error } = await supabase.from("income_entries").insert({
        branch_id: branchId,
        income_date: form.income_date,
        source: form.source || "Manual Income",
        amount: Number(form.amount) || 0,
        payment_method: form.payment_method,
        reference: form.reference || null,
        description: form.description || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Income যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["pop-income"] });
      setOpen(false);
      setForm({ income_date: format(new Date(), "yyyy-MM-dd"), source: "", amount: "", payment_method: "cash", reference: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalManual = manual.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalAuto = collections.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  if (!branchId) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">এই POP-এর জন্য branch assign করা নেই</CardContent></Card>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6 text-emerald-500" /> Income</h1>
          <p className="text-sm text-muted-foreground">Bill collection + Manual income</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Manual Income</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Manual Income যোগ করুন</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>তারিখ</Label><Input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Source / Category</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Connection Fee, Donation" /></div>
              <div className="space-y-1.5"><Label>Payment Method</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Note</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.amount}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Bill Collection</div><div className="text-2xl font-bold text-emerald-600">৳ {totalAuto.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Manual Income</div><div className="text-2xl font-bold text-emerald-600">৳ {totalManual.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">মোট Income</div><div className="text-2xl font-bold">৳ {(totalAuto + totalManual).toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bill Collection (Auto)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>তারিখ</TableHead><TableHead>Client</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {collections.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">কোনো collection নেই</TableCell></TableRow>}
              {collections.slice(0, 50).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{format(new Date(r.created_at), "yyyy-MM-dd")}</TableCell>
                  <TableCell>{r.clients?.name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{r.payment_method || "cash"}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.transaction_id || "—"}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">৳ {Number(r.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Manual Income</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>তারিখ</TableHead><TableHead>Source</TableHead><TableHead>Method</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {manual.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">কোনো manual income নেই</TableCell></TableRow>}
              {manual.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.income_date}</TableCell>
                  <TableCell>{r.source}</TableCell>
                  <TableCell><Badge variant="secondary">{r.payment_method}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.description || "—"}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">৳ {Number(r.amount).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
