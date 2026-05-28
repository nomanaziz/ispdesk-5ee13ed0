import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatAccountingError } from "@/lib/accountingErrors";
import CashOnHandBanner from "@/components/accounting/CashOnHandBanner";

const CATEGORIES_IN = [
  { v: "principal_in", l: "Fund Add (Principal In)" },
  { v: "other", l: "অন্যান্য" },
];
const CATEGORIES_OUT = [
  { v: "principal_repay", l: "Principal Repayment" },
  { v: "interest_pay", l: "Interest Payment" },
  { v: "profit_share", l: "Profit Share" },
  { v: "late_fine", l: "Late Fine" },
  { v: "drawing", l: "Drawing / Withdraw" },
  { v: "other", l: "অন্যান্য" },
];
const METHODS = ["cash", "bank", "bKash", "Nagad", "Rocket", "cheque", "other"];

const defaultForm = {
  contributor_id: "",
  direction: "in",
  category: "principal_in",
  amount: 0,
  transaction_date: new Date().toISOString().slice(0, 10),
  payment_method: "cash",
  reference: "",
  description: "",
};

export default function Transactions() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(defaultForm);
  const [filterContrib, setFilterContrib] = useState("all");

  const { data: contributors } = useQuery({
    queryKey: ["capital-contributors-min"],
    queryFn: async () => {
      const { data } = await supabase.from("capital_contributors" as any).select("id,name,type").order("name");
      return (data ?? []) as any[];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["capital-transactions", filterContrib],
    queryFn: async () => {
      let q = supabase.from("capital_transactions" as any).select("*, capital_contributors(name,type)").order("transaction_date", { ascending: false });
      if (filterContrib !== "all") q = q.eq("contributor_id", filterContrib);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      const { error } = await supabase.from("capital_transactions" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-transactions"] });
      qc.invalidateQueries({ queryKey: ["cash-on-hand"] });
      toast.success("সংরক্ষিত হয়েছে");
      setOpen(false); setForm(defaultForm);
    },
    onError: (e: any) => toast.error(formatAccountingError(e)),
  });

  const cats = form.direction === "in" ? CATEGORIES_IN : CATEGORIES_OUT;

  return (
    <div className="space-y-4">
      <CashOnHandBanner />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">মূলধন লেনদেন</h2>
        <div className="flex items-center gap-2">
          <Select value={filterContrib} onValueChange={setFilterContrib}>
            <SelectTrigger className="w-56"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব অবদানকারী</SelectItem>
              {(contributors ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1"/> নতুন লেনদেন</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>নতুন লেনদেন</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>অবদানকারী</Label>
                  <Select value={form.contributor_id} onValueChange={(v) => setForm({ ...form, contributor_id: v })}>
                    <SelectTrigger><SelectValue placeholder="নির্বাচন করুন"/></SelectTrigger>
                    <SelectContent>{(contributors ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Direction</Label>
                  <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v, category: v === "in" ? "principal_in" : "principal_repay" })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Fund In (টাকা আসছে)</SelectItem>
                      <SelectItem value="out">Fund Out (পরিশোধ/withdraw)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{cats.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (৳)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></div>
                <div><Label>Date</Label><Input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })}/></div>
                <div><Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Reference</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}/></div>
                <div className="col-span-2"><Label>বিবরণ</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !form.contributor_id}>সংরক্ষণ</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>তারিখ</TableHead><TableHead>অবদানকারী</TableHead><TableHead>Direction</TableHead>
            <TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead><TableHead>বিবরণ</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7}>লোড হচ্ছে…</TableCell></TableRow>}
            {(rows ?? []).map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.transaction_date}</TableCell>
                <TableCell>{r.capital_contributors?.name}</TableCell>
                <TableCell>
                  {r.direction === "in"
                    ? <Badge className="bg-green-600"><ArrowDownCircle className="h-3 w-3 mr-1"/>In</Badge>
                    : <Badge variant="destructive"><ArrowUpCircle className="h-3 w-3 mr-1"/>Out</Badge>}
                </TableCell>
                <TableCell>{r.category}</TableCell>
                <TableCell className="text-right tabular-nums">৳ {Number(r.amount).toLocaleString("en-BD")}</TableCell>
                <TableCell>{r.payment_method}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.description}</TableCell>
              </TableRow>
            ))}
            {!isLoading && (rows ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">কোনো লেনদেন নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
