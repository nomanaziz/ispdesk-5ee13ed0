import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ReceiveBillDialog({
  open, onOpenChange, onSaved,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [receiptNo, setReceiptNo] = useState("");
  const [method, setMethod] = useState("cash");
  const [remarks, setRemarks] = useState("");
  const [paidBy, setPaidBy] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase.from("bw_sale_customers").select("id, customer_name, mobile").order("customer_name")
      .then(({ data }) => setCustomers(data || []));
    setInvoiceId(""); setCustomerId(""); setAmount(0); setDiscount(0);
    setReceiptNo(""); setRemarks(""); setMethod("cash"); setPaidBy("");
    setDate(new Date().toISOString().slice(0, 10));
  }, [open]);

  useEffect(() => {
    if (!customerId) { setInvoices([]); setPayments([]); return; }
    supabase.from("bw_sales_invoices").select("*").eq("customer_id", customerId).order("created_at", { ascending: false })
      .then(({ data }) => setInvoices(data || []));
    supabase.from("bw_sale_payments").select("*").eq("customer_id", customerId)
      .then(({ data }) => setPayments(data || []));
  }, [customerId]);

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedInvoice = invoices.find(i => i.id === invoiceId);

  const summary = useMemo(() => {
    const payable = Number(selectedInvoice?.total_amount || selectedInvoice?.amount || 0);
    const invPayments = payments.filter(p => p.invoice_id === invoiceId);
    const approvable = invPayments.filter(p => !p.approved).reduce((s, p) => s + Number(p.amount || 0), 0);
    const approvedTotal = invPayments.filter(p => p.approved).reduce((s, p) => s + Number(p.amount || 0) + Number(p.discount || 0), 0);
    const previous = approvedTotal;
    const balanceDue = Math.max(0, payable - approvedTotal);
    return { payable, previous, approvable, balanceDue };
  }, [invoiceId, selectedInvoice, payments]);

  const submit = async () => {
    if (!customerId) { toast.error("Customer required"); return; }
    if (!amount || amount <= 0) { toast.error("Amount required"); return; }
    const { error } = await supabase.from("bw_sale_payments").insert({
      invoice_id: invoiceId || null,
      customer_id: customerId,
      payment_date: date,
      payment_method: method,
      amount: Number(amount),
      discount: Number(discount || 0),
      receipt_no: receiptNo || null,
      paid_by: paidBy || null,
      remarks: remarks || null,
      description: remarks || null,
      approved: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Bill received — pending approval");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Receive Bill</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>POP / Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={selectedCustomer?.mobile || ""} readOnly className="bg-muted/40" />
          </div>
          <div className="sm:col-span-2">
            <Label>Due Invoice</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId} disabled={!customerId}>
              <SelectTrigger><SelectValue placeholder={customerId ? "Select invoice" : "Pick customer first"} /></SelectTrigger>
              <SelectContent>
                {invoices.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.invoice_no} — {i.billing_month || i.month} — ৳{Number(i.total_amount || i.amount || 0).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-3 rounded border p-3 bg-muted/30">
            <div><div className="text-xs text-muted-foreground">Payable</div><div className="font-semibold">৳{summary.payable.toLocaleString()}</div></div>
            <div><div className="text-xs text-muted-foreground">Previous Paid</div><div className="font-semibold">৳{summary.previous.toLocaleString()}</div></div>
            <div><div className="text-xs text-muted-foreground">Pending Approval</div><div className="font-semibold">৳{summary.approvable.toLocaleString()}</div></div>
            <div><div className="text-xs text-muted-foreground">Balance Due</div><div className="font-semibold text-destructive">৳{summary.balanceDue.toLocaleString()}</div></div>
          </div>

          <div><Label>Receive Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Received Amount *</Label><Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div>
          <div><Label>Discount</Label><Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></div>
          <div><Label>Receipt No</Label><Input value={receiptNo} onChange={e => setReceiptNo(e.target.value)} /></div>
          <div><Label>Paid By</Label><Input value={paidBy} onChange={e => setPaidBy(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Receive Bill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
