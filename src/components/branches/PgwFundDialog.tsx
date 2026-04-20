import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pop: any | null;
  remaining: number;
}

export default function PgwFundDialog({ open, onOpenChange, pop, remaining }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("give");
  const [giveForm, setGiveForm] = useState({
    amount: 0, fund_date: new Date().toISOString().slice(0, 10), remarks: "",
  });
  const [selectedInvoice, setSelectedInvoice] = useState<string>("");
  const [adjustAmount, setAdjustAmount] = useState(0);

  useEffect(() => {
    if (open) {
      setGiveForm({ amount: remaining, fund_date: new Date().toISOString().slice(0, 10), remarks: "" });
      setSelectedInvoice("");
      setAdjustAmount(0);
      setTab("give");
    }
  }, [open, remaining]);

  // Due fund invoices for this POP
  const { data: dueInvoices } = useQuery({
    queryKey: ["pop-due-funding", pop?.branch_id],
    enabled: !!pop?.branch_id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_funding")
        .select("id, invoice_number, amount, received_amount, due_amount, funding_date, remarks")
        .eq("branch_id", pop.branch_id)
        .gt("due_amount", 0)
        .order("funding_date", { ascending: true });
      return data ?? [];
    },
  });

  const giveFund = useMutation({
    mutationFn: async () => {
      if (!pop) throw new Error("POP নেই");
      if (giveForm.amount <= 0) throw new Error("পরিমাণ ০ এর বেশি হতে হবে");
      if (giveForm.amount > remaining) throw new Error("Remaining এর চেয়ে বেশি দেওয়া যাবে না");
      const { data: auth } = await supabase.auth.getUser();

      // 1) Insert funding row (trans_type=received) — auto invoice + balance trigger
      const { data: fund, error: fErr } = await supabase
        .from("branch_funding")
        .insert({
          branch_id: pop.branch_id,
          amount: giveForm.amount,
          received_amount: giveForm.amount,
          discount: 0,
          trans_type: "received",
          payment_method: "pgw",
          status: "paid",
          funding_date: giveForm.fund_date,
          received_on: giveForm.fund_date,
          remarks: giveForm.remarks || `PGW fund transfer for POP ${pop.pop_code || pop.name}`,
          created_by: auth.user?.id ?? null,
        })
        .select("id, invoice_number")
        .single();
      if (fErr) throw fErr;

      // 2) Insert PGW settlement row method=fund linked to funding
      const { error: sErr } = await supabase.from("reseller_pgw_settlements").insert({
        reseller_id: pop.id,
        amount: giveForm.amount,
        method: "fund",
        settlement_type: "fund",
        funding_id: fund?.id ?? null,
        reference: fund?.invoice_number ?? null,
        notes: giveForm.remarks || null,
        payment_date: giveForm.fund_date,
        status: "completed",
        created_by: auth.user?.id ?? null,
      });
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgw-pop-rollup"] });
      qc.invalidateQueries({ queryKey: ["pgw-settlements-history"] });
      qc.invalidateQueries({ queryKey: ["pgw-pop-transactions"] });
      qc.invalidateQueries({ queryKey: ["pop-due-funding"] });
      toast.success("ফান্ড সফলভাবে ট্রান্সফার হয়েছে");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const adjustDue = useMutation({
    mutationFn: async () => {
      if (!pop || !selectedInvoice) throw new Error("একটি invoice select করুন");
      if (adjustAmount <= 0) throw new Error("পরিমাণ ০ এর বেশি হতে হবে");
      if (adjustAmount > remaining) throw new Error("Remaining এর চেয়ে বেশি দেওয়া যাবে না");
      const inv = dueInvoices?.find((i: any) => i.id === selectedInvoice);
      if (!inv) throw new Error("Invoice পাওয়া যায়নি");
      if (adjustAmount > Number(inv.due_amount || 0)) throw new Error("Invoice due এর চেয়ে বেশি দেওয়া যাবে না");
      const { data: auth } = await supabase.auth.getUser();

      // Update existing funding: increase received, decrease due
      const newReceived = Number(inv.received_amount || 0) + adjustAmount;
      const newDue = Number(inv.due_amount || 0) - adjustAmount;
      const { error: uErr } = await supabase
        .from("branch_funding")
        .update({
          received_amount: newReceived,
          due_amount: newDue,
          status: newDue <= 0 ? "paid" : "partial",
        })
        .eq("id", selectedInvoice);
      if (uErr) throw uErr;

      // Create settlement row method=fund linked
      const { error: sErr } = await supabase.from("reseller_pgw_settlements").insert({
        reseller_id: pop.id,
        amount: adjustAmount,
        method: "fund",
        settlement_type: "fund",
        funding_id: selectedInvoice,
        reference: inv.invoice_number,
        notes: `Adjusted against invoice ${inv.invoice_number}`,
        payment_date: new Date().toISOString().slice(0, 10),
        status: "completed",
        created_by: auth.user?.id ?? null,
      });
      if (sErr) throw sErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgw-pop-rollup"] });
      qc.invalidateQueries({ queryKey: ["pgw-settlements-history"] });
      qc.invalidateQueries({ queryKey: ["pop-due-funding"] });
      toast.success("Due invoice adjust হয়েছে");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!pop) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Fund Transactions — {pop.name}</DialogTitle></DialogHeader>
        <div className="bg-muted/50 p-3 rounded text-sm flex items-center justify-between mb-2">
          <div>POP কোড: <strong>{pop.pop_code || "-"}</strong></div>
          <div>Remaining PGW: <strong className="text-primary">৳{Number(remaining).toFixed(2)}</strong></div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="due">Due Fund Invoice</TabsTrigger>
            <TabsTrigger value="give">Give Fund</TabsTrigger>
          </TabsList>

          <TabsContent value="due" className="space-y-3">
            <div className="max-h-64 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueInvoices?.map((inv: any) => (
                    <TableRow
                      key={inv.id}
                      className={selectedInvoice === inv.id ? "bg-accent" : "cursor-pointer"}
                      onClick={() => { setSelectedInvoice(inv.id); setAdjustAmount(Math.min(remaining, Number(inv.due_amount || 0))); }}
                    >
                      <TableCell><input type="radio" checked={selectedInvoice === inv.id} readOnly /></TableCell>
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.funding_date}</TableCell>
                      <TableCell>৳{Number(inv.amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant="destructive">৳{Number(inv.due_amount).toFixed(2)}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!dueInvoices || dueInvoices.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো due invoice নেই</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div>
              <Label>Adjust Amount</Label>
              <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} disabled={!selectedInvoice} />
            </div>
            <Button className="w-full" disabled={!selectedInvoice || adjustDue.isPending} onClick={() => adjustDue.mutate()}>
              {adjustDue.isPending ? "প্রক্রিয়াকরণ..." : "Due Invoice Adjust করুন"}
            </Button>
          </TabsContent>

          <TabsContent value="give" className="space-y-3">
            <div>
              <Label>Remaining PGW Payment</Label>
              <Input value={`৳${Number(remaining).toFixed(2)}`} readOnly className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Funding Amount *</Label>
                <Input type="number" value={giveForm.amount} onChange={(e) => setGiveForm({ ...giveForm, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Fund Date *</Label>
                <Input type="date" value={giveForm.fund_date} onChange={(e) => setGiveForm({ ...giveForm, fund_date: e.target.value })} />
              </div>
            </div>
            <div className="bg-muted/50 p-2 rounded text-xs text-muted-foreground">
              Invoice Number auto-generated হবে। POP-এর ব্যালেন্স স্বয়ংক্রিয়ভাবে বাড়বে।
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea rows={2} value={giveForm.remarks} onChange={(e) => setGiveForm({ ...giveForm, remarks: e.target.value })} />
            </div>
            <Button className="w-full" disabled={giveFund.isPending} onClick={() => giveFund.mutate()}>
              {giveFund.isPending ? "প্রক্রিয়াকরণ..." : "Fund ট্রান্সফার করুন"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
