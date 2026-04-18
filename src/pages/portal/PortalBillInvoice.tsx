import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Printer, Receipt, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const PortalBillInvoice = () => {
  const { id } = useParams();
  const { customer } = usePortalAuth();
  const qc = useQueryClient();

  const { data: bill, isLoading } = useQuery({
    queryKey: ["portal-bill", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing")
        .select("*, clients(name, client_id, contact, address, email, monthly_bill)")
        .eq("id", id!)
        .eq("client_id", customer!.sub)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!customer?.sub,
  });

  const { data: company } = useQuery({
    queryKey: ["portal-company-info-invoice"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "company_info")
        .maybeSingle();
      return (data?.setting_value || {}) as any;
    },
  });

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("bkash");
  const [txnId, setTxnId] = useState("");
  const [note, setNote] = useState("");

  const submitPay = useMutation({
    mutationFn: async () => {
      if (!bill) throw new Error("No bill");
      if (!txnId) throw new Error("Transaction ID required");
      const { error } = await supabase.from("bill_collections").insert({
        billing_id: bill.id,
        client_id: bill.client_id,
        amount: payAmount,
        payment_method: payMethod,
        transaction_id: txnId,
        note: note || `Online payment via portal`,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("পেমেন্ট সাবমিট হয়েছে — admin অনুমোদনের পর update হবে");
      setPayOpen(false);
      qc.invalidateQueries({ queryKey: ["portal-bill", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-10 text-center">লোড হচ্ছে...</div>;
  if (!bill) return <div className="p-10 text-center">বিল পাওয়া যায়নি</div>;

  const c: any = bill.clients;
  const due = Number(bill.due || 0);
  const isUnpaid = due > 0 && bill.status !== "paid";
  const companyName = company?.name || company?.brand?.name || "ISP Desk";
  const hotline = company?.hotline || company?.phone;

  const openPay = () => {
    setPayAmount(due);
    setPayOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal/bills"><ArrowLeft className="h-4 w-4" /> ফিরে যান</Link>
        </Button>
        <div className="flex items-center gap-2">
          {isUnpaid && (
            <Button onClick={openPay} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <CreditCard className="h-4 w-4" /> Pay Now ৳{due.toLocaleString()}
            </Button>
          )}
          <Button onClick={() => window.print()} size="sm" variant="outline">
            <Printer className="h-4 w-4" /> প্রিন্ট
          </Button>
        </div>
      </div>

      {/* UNPAID banner */}
      {isUnpaid && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-4 py-3 flex items-center gap-3 print:hidden">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">UNPAID — ৳{due.toLocaleString()} বকেয়া</div>
            <div className="text-xs text-rose-700 dark:text-rose-300">
              {hotline ? `অথবা ${hotline} নম্বরে bKash/Nagad/Rocket-এ পাঠিয়ে Transaction ID submit করুন।` : "আপনার পেমেন্ট দিতে Pay Now চাপুন।"}
            </div>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-sm print:shadow-none">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-5 mb-5 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {company?.logo_url ? (
                <img src={company.logo_url} alt={companyName} className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                  <Receipt className="h-7 w-7" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{companyName}</h1>
                {company?.address && <p className="text-xs text-muted-foreground">{company.address}</p>}
                <p className="text-xs text-muted-foreground">
                  {hotline && <>📞 {hotline}</>}
                  {company?.email && <> • ✉️ {company.email}</>}
                  {company?.website && <> • 🌐 {company.website}</>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">ইনভয়েস নং</div>
              <div className="text-lg font-bold">{bill.bill_id}</div>
              <Badge className={`mt-1 ${bill.status === "paid" ? "bg-emerald-100 text-emerald-700" : bill.status === "partial" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"} border-0 text-xs uppercase`}>
                {bill.status === "paid" ? "PAID" : bill.status === "partial" ? "PARTIAL" : "UNPAID"}
              </Badge>
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1.5">Bill To</div>
              <div className="font-semibold">{c?.name}</div>
              <div className="text-sm text-muted-foreground">আইডি: {c?.client_id}</div>
              {c?.contact && <div className="text-sm text-muted-foreground">📞 {c.contact}</div>}
              {c?.email && <div className="text-sm text-muted-foreground">✉️ {c.email}</div>}
              {c?.address && <div className="text-sm text-muted-foreground">{c.address}</div>}
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase text-muted-foreground mb-1.5">বিলিং তথ্য</div>
              <div className="text-sm">মাস: <span className="font-semibold">{bill.month}</span></div>
              {bill.due_date && <div className="text-sm text-muted-foreground">শেষ তারিখ: {bill.due_date}</div>}
              {bill.pay_date && <div className="text-sm text-emerald-600">পরিশোধ: {bill.pay_date}</div>}
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6 text-sm border rounded overflow-hidden">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left py-2.5 px-3">বর্ণনা</th>
                <th className="text-right py-2.5 px-3">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-3">মাসিক ইন্টারনেট সার্ভিস ({bill.month})</td>
                <td className="py-3 px-3 text-right font-medium">৳{Number(bill.amount || 0).toLocaleString()}</td>
              </tr>
              {Number(bill.discount || 0) > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-3 text-muted-foreground">ডিসকাউন্ট</td>
                  <td className="py-3 px-3 text-right text-emerald-600">- ৳{Number(bill.discount).toLocaleString()}</td>
                </tr>
              )}
              {Number(bill.vat || 0) > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-3 text-muted-foreground">ভ্যাট</td>
                  <td className="py-3 px-3 text-right">৳{Number(bill.vat).toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">মোট</span>
                <span className="font-medium">৳{Number(bill.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">পরিশোধিত</span>
                <span className="text-emerald-600">৳{Number(bill.paid || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>বকেয়া</span>
                <span className={due > 0 ? "text-rose-600" : "text-emerald-600"}>৳{due.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-8 pt-5 border-t">
            ধন্যবাদ। সময়মত পেমেন্ট করার জন্য অনুরোধ রইলো।
            {hotline && <div className="mt-1">যেকোনো সহায়তায়: <strong>{hotline}</strong></div>}
          </div>
        </CardContent>
      </Card>

      {/* Pay Now dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>পেমেন্ট সাবমিট করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {hotline && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
                <div className="font-semibold text-emerald-800 dark:text-emerald-200">পেমেন্ট নম্বর</div>
                <div className="text-emerald-900 dark:text-emerald-100 mt-1">{hotline}</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  এই নম্বরে bKash/Nagad/Rocket-এ পাঠিয়ে নিচে Transaction ID দিন।
                </div>
              </div>
            )}
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (৳)</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Transaction ID *</Label>
              <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 8A9B2C1D" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reference / sender number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button
              onClick={() => submitPay.mutate()}
              disabled={!txnId || payAmount <= 0 || submitPay.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitPay.isPending ? "সাবমিট হচ্ছে…" : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalBillInvoice;
