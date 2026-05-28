import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CalendarClock, RefreshCw } from "lucide-react";
import { formatAccountingError } from "@/lib/accountingErrors";
import CashOnHandBanner from "@/components/accounting/CashOnHandBanner";

export default function Schedule() {
  const qc = useQueryClient();
  const [payRow, setPayRow] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({ principal: 0, interest: 0, fine: 0, payment_method: "cash" });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["capital-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_installment_schedule" as any)
        .select("*, capital_contributors(name,type)")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_capital_installments_daily" as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["capital-schedule"] }); toast.success("Overdue ও fine আপডেট হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!payRow) return;
      const total = Number(payForm.principal) + Number(payForm.interest) + Number(payForm.fine);
      if (total <= 0) throw new Error("Amount শূন্য");
      // Insert principal payment
      if (Number(payForm.principal) > 0) {
        const { error } = await supabase.from("capital_transactions" as any).insert({
          contributor_id: payRow.contributor_id, direction: "out", category: "principal_repay",
          amount: Number(payForm.principal), payment_method: payForm.payment_method,
          schedule_id: payRow.id, description: `Installment #${payRow.installment_no} principal`,
        });
        if (error) throw error;
      }
      if (Number(payForm.interest) > 0) {
        const { error } = await supabase.from("capital_transactions" as any).insert({
          contributor_id: payRow.contributor_id, direction: "out", category: "interest_pay",
          amount: Number(payForm.interest), payment_method: payForm.payment_method,
          schedule_id: payRow.id, description: `Installment #${payRow.installment_no} interest`,
        });
        if (error) throw error;
      }
      if (Number(payForm.fine) > 0) {
        const { error } = await supabase.from("capital_transactions" as any).insert({
          contributor_id: payRow.contributor_id, direction: "out", category: "late_fine",
          amount: Number(payForm.fine), payment_method: payForm.payment_method,
          schedule_id: payRow.id, description: `Installment #${payRow.installment_no} late fine`,
        });
        if (error) throw error;
      }
      const newPaid = Number(payRow.paid_amount || 0) + Number(payForm.principal) + Number(payForm.interest);
      const status = newPaid >= Number(payRow.total_due) ? "paid" : "partial";
      const { error: e2 } = await supabase.from("capital_installment_schedule" as any)
        .update({ paid_amount: newPaid, status, paid_at: status === "paid" ? new Date().toISOString() : null })
        .eq("id", payRow.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-schedule"] });
      qc.invalidateQueries({ queryKey: ["cash-on-hand"] });
      toast.success("পরিশোধ সম্পন্ন");
      setPayRow(null);
    },
    onError: (e: any) => toast.error(formatAccountingError(e)),
  });

  const openPay = (r: any) => {
    setPayRow(r);
    setPayForm({
      principal: Number(r.principal_due) - (Number(r.paid_amount) > Number(r.interest_due) ? Number(r.paid_amount) - Number(r.interest_due) : 0),
      interest: Number(r.interest_due),
      fine: Number(r.fine_amount || 0),
      payment_method: "cash",
    });
  };

  return (
    <div className="space-y-4">
      <CashOnHandBanner />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5"/> কিস্তি সূচি</h2>
        <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <RefreshCw className="h-4 w-4 mr-1"/> Overdue/Fine refresh
        </Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>অবদানকারী</TableHead><TableHead>#</TableHead><TableHead>Due Date</TableHead>
            <TableHead className="text-right">Principal</TableHead><TableHead className="text-right">Interest</TableHead>
            <TableHead className="text-right">Fine</TableHead><TableHead className="text-right">Paid</TableHead>
            <TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9}>লোড হচ্ছে…</TableCell></TableRow>}
            {(rows ?? []).map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.capital_contributors?.name}</TableCell>
                <TableCell>{r.installment_no}</TableCell>
                <TableCell>{r.due_date}</TableCell>
                <TableCell className="text-right tabular-nums">৳ {Number(r.principal_due).toLocaleString("en-BD")}</TableCell>
                <TableCell className="text-right tabular-nums">৳ {Number(r.interest_due).toLocaleString("en-BD")}</TableCell>
                <TableCell className="text-right tabular-nums">৳ {Number(r.fine_amount).toLocaleString("en-BD")}</TableCell>
                <TableCell className="text-right tabular-nums">৳ {Number(r.paid_amount).toLocaleString("en-BD")}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "paid" ? "default" : r.status === "overdue" ? "destructive" : "secondary"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {r.status !== "paid" && <Button size="sm" onClick={() => openPay(r)}>পরিশোধ</Button>}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (rows ?? []).length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">কোনো কিস্তি নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!payRow} onOpenChange={(o) => !o && setPayRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>কিস্তি পরিশোধ — #{payRow?.installment_no}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Principal</Label><Input type="number" value={payForm.principal} onChange={e => setPayForm({ ...payForm, principal: Number(e.target.value) })}/></div>
            <div><Label>Interest</Label><Input type="number" value={payForm.interest} onChange={e => setPayForm({ ...payForm, interest: Number(e.target.value) })}/></div>
            <div><Label>Late Fine</Label><Input type="number" value={payForm.fine} onChange={e => setPayForm({ ...payForm, fine: Number(e.target.value) })}/></div>
            <div><Label>Method</Label><Input value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}/></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayRow(null)}>বাতিল</Button>
            <Button onClick={() => pay.mutate()} disabled={pay.isPending}>সংরক্ষণ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
