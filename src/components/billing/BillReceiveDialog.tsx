import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
  billing: any;
  invalidateKey?: string;
}

export default function BillReceiveDialog({ open, onOpenChange, client, billing, invalidateKey }: Props) {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);

  const monthlyBill = Number(billing?.amount ?? client?.monthly_bill ?? 0);
  const alreadyPaid = Number(billing?.paid || 0);
  const dueAmount = monthlyBill - alreadyPaid;

  const [receivedDate, setReceivedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receivedAmount, setReceivedAmount] = useState(dueAmount > 0 ? dueAmount : monthlyBill);
  const [discount, setDiscount] = useState(Number(billing?.discount || 0));
  const [vatAmount, setVatAmount] = useState(Number(billing?.vat || 0));
  const [applyVat, setApplyVat] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionNo, setTransactionNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [setNextBilling, setSetNextBilling] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [receivedBy, setReceivedBy] = useState(user?.id || "");

  // Fetch employees/profiles for "Received By" dropdown
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-receive"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      return data || [];
    },
    enabled: open,
  });

  // Filter: admin sees all, non-admin sees only self
  const availableProfiles = isAdmin
    ? profiles
    : profiles.filter((p: any) => p.user_id === user?.id);

  useEffect(() => {
    if (open) {
      const due = dueAmount > 0 ? dueAmount : monthlyBill;
      setReceivedAmount(due);
      setDiscount(Number(billing?.discount || 0));
      setVatAmount(Number(billing?.vat || 0));
      setReceivedDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod("cash");
      setTransactionNo("");
      setRemarks("");
      setSetNextBilling(true);
      setSendSms(false);
      setApplyVat(false);
      setReceivedBy(user?.id || "");
    }
  }, [open, billing, dueAmount, monthlyBill, user?.id]);

  const totalReceived = receivedAmount - discount + (applyVat ? vatAmount : 0);
  const balanceDue = monthlyBill - alreadyPaid - totalReceived;
  const isAdvance = balanceDue < 0;

  const handleSubmit = async () => {
    if (receivedAmount <= 0) {
      toast.error("রিসিভ পরিমাণ ০ এর বেশি হতে হবে");
      return;
    }
    setLoading(true);
    try {
      const newPaid = alreadyPaid + totalReceived;
      const newDue = Math.max(0, monthlyBill - newPaid);
      const newAdvance = newPaid > monthlyBill ? newPaid - monthlyBill : 0;
      const newStatus = newDue <= 0 ? "paid" : "partial";
      const finalRemarks = isAdvance ? `Advance Pay. ${remarks}`.trim() : remarks;

      if (billing?.id) {
        const { error } = await supabase.from("billing").update({
          paid: newPaid,
          due: newDue,
          advance: newAdvance,
          status: newStatus,
          pay_date: receivedDate,
          payment_method: paymentMethod,
          collected_by: receivedBy || null,
          discount: discount,
          vat: applyVat ? vatAmount : 0,
        }).eq("id", billing.id);
        if (error) throw error;
      }

      // Insert collection record
      await supabase.from("bill_collections").insert({
        client_id: client.id,
        billing_id: billing?.id || null,
        amount: totalReceived,
        discount: discount,
        vat: applyVat ? vatAmount : 0,
        payment_method: paymentMethod,
        note: finalRemarks || null,
        transaction_id: transactionNo || null,
        received_by: receivedBy || null,
        status: "approved",
      });

      // Insert income entry for accounting (cash/online/bank — all collections count as income)
      const monthKey = (billing?.month || receivedDate || new Date().toISOString().slice(0, 10)).slice(0, 7);
      await supabase.from("income_entries").insert({
        amount: totalReceived,
        source: "bill_collection",
        description: `বিল কালেকশন — ${client.name} (${client.client_id || ""})`,
        income_date: receivedDate,
        month: monthKey,
        client_id: client.id,
        payment_method: paymentMethod,
        reference: billing?.id || null,
        received_by: receivedBy || null,
        status: "approved",
      });

      // Extend expire date if checked
      if (setNextBilling) {
        // Detect tariff type for this client (via package → reseller_tariff_packages → reseller_tariffs)
        let tariffType: "custom" | "date_to_date" = "date_to_date";
        let validityDays = 0;
        if (client.package_id) {
          const { data: tpkg } = await supabase
            .from("reseller_tariff_packages")
            .select("validity_days, reseller_tariffs(tariff_type)")
            .eq("package_id", client.package_id)
            .limit(1)
            .maybeSingle();
          const tt = (tpkg as any)?.reseller_tariffs?.tariff_type;
          if (tt === "custom") {
            tariffType = "custom";
            validityDays = Number((tpkg as any)?.validity_days || 30);
          }
        }

        let newExpire: string;
        if (tariffType === "custom" && validityDays > 0) {
          // Custom: extend from existing expire (or today) by validity_days
          const base = client.expire_date ? new Date(client.expire_date) : new Date();
          base.setDate(base.getDate() + validityDays);
          newExpire = base.toISOString().slice(0, 10);
        } else {
          // Date-to-Date: next month same billing day (clamped to last day)
          const bd = client.billing_date || client.expire_day || 1;
          const now = new Date();
          let year = now.getFullYear();
          let month = now.getMonth() + 2; // next month (1-indexed)
          if (month > 12) { month -= 12; year++; }
          const lastDay = new Date(year, month, 0).getDate();
          const day = Math.min(bd, lastDay);
          newExpire = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
        await supabase.from("clients").update({ expire_date: newExpire }).eq("id", client.id);
      }

      // Auto-enable MikroTik if fully paid
      if (newDue <= 0 && client.mikrotik_id && client.username) {
        await supabase.from("clients").update({ mikrotik_status: "enabled" }).eq("id", client.id);
        try {
          await supabase.functions.invoke("manage-mikrotik-ppp", {
            body: {
              mikrotik_id: client.mikrotik_id,
              username: client.username,
              client_id: client.id,
              action: "enable",
            },
          });
        } catch { /* best effort */ }
      }

      toast.success("বিল রিসিভ সম্পন্ন হয়েছে");
      queryClient.invalidateQueries({ queryKey: [invalidateKey || "billing-list"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "বিল রিসিভ ব্যর্থ হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  const receivedByName = availableProfiles.find((p: any) => p.user_id === receivedBy)?.full_name || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>বিল গ্রহণ — {client.name} ({client.client_id})</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info - 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">গ্রহণের তারিখ</Label>
              <Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">ইউজার নেম</Label>
              <Input value={client.username || "-"} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div>
              <Label className="text-xs">ক্লায়েন্ট কোড</Label>
              <Input value={client.client_id} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div>
              <Label className="text-xs">মোবাইল নম্বর</Label>
              <Input value={client.contact || "-"} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div>
              <Label className="text-xs">প্যাকেজ</Label>
              <Input value={client.package?.name || client.isp_packages?.name || "-"} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div>
              <Label className="text-xs">গ্রহণ করা হয়েছে</Label>
              <Input value={client.name} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div>
              <Label className="text-xs">মাসিক বিল</Label>
              <Input value={monthlyBill} readOnly className="h-8 text-xs bg-muted" />
            </div>
            <div>
              <Label className="text-xs">বকেয়া পরিমাণ</Label>
              <Input value={dueAmount > 0 ? dueAmount : 0} readOnly className="h-8 text-xs bg-muted text-red-500 font-bold" />
            </div>
            <div>
              <Label className="text-xs">গ্রহণকারী</Label>
              <Select value={receivedBy} onValueChange={setReceivedBy}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="নির্বাচন করুন..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((p: any) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">পেমেন্ট মাধ্যম</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">ক্যাশ</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="rocket">Rocket</SelectItem>
                  <SelectItem value="bank">ব্যাংক ট্রান্সফার</SelectItem>
                  <SelectItem value="online">অনলাইন</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Details Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-left">প্রদেয়</th>
                  <th className="p-2 text-left">ছাড়</th>
                  <th className="p-2 text-left">গৃহীত</th>
                  <th className="p-2 text-left">VAT</th>
                  <th className="p-2 text-left">মোট</th>
                  <th className="p-2 text-left">ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 font-medium">৳{monthlyBill}</td>
                  <td className="p-2">
                    <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="h-7 w-20 text-xs" min={0} />
                  </td>
                  <td className="p-2">
                    <Input type="number" value={receivedAmount} onChange={e => setReceivedAmount(Number(e.target.value))} className="h-7 w-24 text-xs" min={0} />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <Checkbox checked={applyVat} onCheckedChange={(v) => setApplyVat(!!v)} />
                      <Input type="number" value={vatAmount} onChange={e => setVatAmount(Number(e.target.value))} className="h-7 w-16 text-xs" min={0} disabled={!applyVat} />
                    </div>
                  </td>
                  <td className="p-2 font-bold text-green-600">৳{totalReceived}</td>
                  <td className={`p-2 font-bold ${balanceDue > 0 ? "text-red-500" : "text-green-600"}`}>
                    ৳{Math.abs(balanceDue)} {isAdvance && "(অগ্রিম)"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transaction & Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">রসিদ/ট্রানজেকশন নম্বর</Label>
              <Input value={transactionNo} onChange={e => setTransactionNo(e.target.value)} className="h-8 text-xs" placeholder="ঐচ্ছিক" />
            </div>
            <div>
              <Label className="text-xs">মন্তব্য</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="text-xs h-8 min-h-[32px]" placeholder="ঐচ্ছিক" />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={setNextBilling} onCheckedChange={(v) => setSetNextBilling(!!v)} />
              পরবর্তী বিলিং তারিখ সেট করবেন?
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={sendSms} onCheckedChange={(v) => setSendSms(!!v)} />
              SMS পাঠাবেন?
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "প্রসেস হচ্ছে..." : "গ্রহণ করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
