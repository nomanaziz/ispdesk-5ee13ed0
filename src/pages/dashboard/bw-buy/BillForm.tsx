import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Save, Wand2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { buildBuyBillItems, getMonthRange } from "@/lib/bwBuyProrate";

interface LineItem {
  id?: string;
  subscription_id?: string | null;
  service_id?: string | null;
  service_name: string;
  bandwidth_mbps: number;
  rate: number;
  period_start: string;
  period_end: string;
  days: number;
  total_days_in_month: number;
  amount: number;
}

const emptyLine = (totalDays = 30): LineItem => ({
  service_name: "",
  bandwidth_mbps: 0,
  rate: 0,
  period_start: "",
  period_end: "",
  days: 0,
  total_days_in_month: totalDays,
  amount: 0,
});

const recompute = (l: LineItem): LineItem => {
  const td = Number(l.total_days_in_month) || 30;
  const amount = (Number(l.bandwidth_mbps) * Number(l.rate) * Number(l.days)) / td;
  return { ...l, amount: Math.round(amount * 100) / 100 };
};

export default function BillForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    provider_id: "",
    bill_no: "",
    invoice_no: "",
    billing_month: new Date().toISOString().slice(0, 7),
    payment_due: "",
    paid: "0",
    discount: "0",
    remarks: "",
    status: "unpaid",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const { data: providers } = useQuery({
    queryKey: ["bw_providers_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bw_providers")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Load existing bill for edit
  useQuery({
    queryKey: ["bw_bill_edit", id],
    queryFn: async () => {
      if (!isEdit) return null;
      const { data: bill, error } = await supabase
        .from("bw_purchase_bills")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setForm({
        provider_id: bill.provider_id || "",
        bill_no: bill.bill_no || "",
        invoice_no: bill.invoice_no || "",
        billing_month: bill.billing_month || bill.month || new Date().toISOString().slice(0, 7),
        payment_due: bill.payment_due || "",
        paid: String(bill.paid || 0),
        discount: String(bill.discount || 0),
        remarks: bill.remarks || "",
        status: bill.status || "unpaid",
      });

      // Try new bw_buy_bill_items first
      const { data: newItems } = await supabase
        .from("bw_buy_bill_items")
        .select("*")
        .eq("bill_id", id!)
        .order("sort_order");
      if (newItems && newItems.length > 0) {
        setLines(
          newItems.map((li: any) => ({
            id: li.id,
            subscription_id: li.subscription_id,
            service_id: li.service_id,
            service_name: li.service_name,
            bandwidth_mbps: Number(li.bandwidth_mbps),
            rate: Number(li.rate),
            period_start: li.period_start,
            period_end: li.period_end,
            days: Number(li.days),
            total_days_in_month: Number(li.total_days_in_month),
            amount: Number(li.amount),
          })),
        );
      }
      return bill;
    },
    enabled: isEdit,
  });

  // Auto-generate bill number for new bills
  useEffect(() => {
    if (!isEdit && !form.bill_no) {
      const now = new Date();
      const billNo = `BW-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
      setForm((f) => ({ ...f, bill_no: billNo }));
    }
  }, [isEdit, form.bill_no]);

  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    updated[index] = recompute(updated[index]);
    setLines(updated);
  };

  const addLine = () => {
    const range = form.billing_month ? getMonthRange(form.billing_month) : null;
    setLines([...lines, emptyLine(range?.total_days || 30)]);
  };
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const grandTotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  const autoGenerate = async () => {
    if (!form.provider_id) {
      toast.error("আগে প্রোভাইডার নির্বাচন করুন");
      return;
    }
    if (!form.billing_month) {
      toast.error("বিলিং মাস নির্বাচন করুন");
      return;
    }
    try {
      const segments = await buildBuyBillItems(form.provider_id, form.billing_month);
      if (segments.length === 0) {
        toast.error("এই মাসে এই প্রোভাইডারের কোনো সক্রিয় সাবস্ক্রিপশন নেই");
        return;
      }
      setLines(
        segments.map((s) => ({
          subscription_id: s.subscription_id,
          service_id: s.service_id,
          service_name: s.service_name,
          bandwidth_mbps: s.bandwidth_mbps,
          rate: s.rate,
          period_start: s.period_start,
          period_end: s.period_end,
          days: s.days,
          total_days_in_month: s.total_days_in_month,
          amount: s.amount,
        })),
      );
      toast.success(`${segments.length}টি লাইন আইটেম তৈরি হয়েছে`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.provider_id) throw new Error("প্রোভাইডার নির্বাচন করুন");
      if (!form.bill_no) throw new Error("বিল নম্বর আবশ্যক");

      let attachment_url = null;
      if (attachmentFile) {
        const ext = attachmentFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("bw-bill-attachments")
          .upload(path, attachmentFile);
        if (error) throw error;
        const { data } = supabase.storage.from("bw-bill-attachments").getPublicUrl(path);
        attachment_url = data.publicUrl;
      }

      const range = form.billing_month ? getMonthRange(form.billing_month) : null;

      const payload: any = {
        provider_id: form.provider_id,
        bill_no: form.bill_no,
        invoice_no: form.invoice_no || null,
        billing_month: form.billing_month ? `${form.billing_month}-01` : null,
        month: form.billing_month ? `${form.billing_month}-01` : null,
        payment_due: form.payment_due || null,
        period_start: range?.period_start || null,
        period_end: range?.period_end || null,
        amount: grandTotal,
        total_amount: grandTotal,
        paid: Number(form.paid || 0),
        discount: Number(form.discount || 0),
        remarks: form.remarks || null,
        status: form.status,
      };
      if (attachment_url) payload.attachment_url = attachment_url;

      let billId = id;
      if (isEdit) {
        const { error } = await supabase
          .from("bw_purchase_bills")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        await supabase.from("bw_buy_bill_items").delete().eq("bill_id", id!);
      } else {
        const { data, error } = await supabase
          .from("bw_purchase_bills")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        billId = data.id;
      }

      // Insert line items into new pro-rated table
      const valid = lines.filter((l) => l.service_name && Number(l.amount) > 0);
      if (valid.length > 0) {
        const linePayload = valid.map((l, idx) => ({
          bill_id: billId!,
          subscription_id: l.subscription_id || null,
          service_id: l.service_id || null,
          service_name: l.service_name,
          bandwidth_mbps: Number(l.bandwidth_mbps),
          rate: Number(l.rate),
          period_start: l.period_start || range?.period_start || new Date().toISOString().slice(0, 10),
          period_end: l.period_end || range?.period_end || new Date().toISOString().slice(0, 10),
          days: Number(l.days),
          total_days_in_month: Number(l.total_days_in_month),
          amount: Number(l.amount),
          sort_order: idx,
        }));
        const { error } = await supabase.from("bw_buy_bill_items").insert(linePayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bw_purchase_bills"] });
      toast.success(isEdit ? "বিল আপডেট হয়েছে" : "বিল তৈরি হয়েছে");
      navigate("/dashboard/bw-buy/bills");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/bw-buy/bills")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? "বিল সম্পাদনা" : "নতুন পার্চেজ বিল"}
          </h1>
          <p className="text-sm text-muted-foreground">
            ব্যান্ডউইথ ক্রয় — service-wise pro-rated বিল
          </p>
        </div>
      </div>

      {/* Bill Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">বিল তথ্য</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                প্রোভাইডার <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.provider_id}
                onValueChange={(v) => setForm({ ...form, provider_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="প্রোভাইডার নির্বাচন" />
                </SelectTrigger>
                <SelectContent>
                  {(providers || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                বিল নং <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.bill_no}
                onChange={(e) => setForm({ ...form, bill_no: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ইনভয়েস নং</label>
              <Input
                value={form.invoice_no}
                onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                বিলিং মাস <span className="text-destructive">*</span>
              </label>
              <Input
                type="month"
                value={form.billing_month}
                onChange={(e) => setForm({ ...form, billing_month: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">পেমেন্ট ডিউ</label>
              <Input
                type="date"
                value={form.payment_due}
                onChange={(e) => setForm({ ...form, payment_due: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">স্ট্যাটাস</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">অপরিশোধিত</SelectItem>
                  <SelectItem value="partial">আংশিক</SelectItem>
                  <SelectItem value="paid">পরিশোধিত</SelectItem>
                  <SelectItem value="due">বকেয়া</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">পরিশোধিত (৳)</label>
              <Input
                type="number"
                value={form.paid}
                onChange={(e) => setForm({ ...form, paid: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ডিসকাউন্ট (৳)</label>
              <Input
                type="number"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">সংযুক্তি</label>
              <Input
                type="file"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">আইটেম সমূহ (Service-wise pro-rated)</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Formula: mbps × rate × days / total_days_in_month
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="default" onClick={autoGenerate} className="gap-1">
              <Wand2 className="h-3.5 w-3.5" /> Auto-generate
            </Button>
            <Button size="sm" variant="outline" onClick={addLine} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> ম্যানুয়াল আইটেম
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">সার্ভিস</TableHead>
                  <TableHead className="w-24 text-right">Mbps</TableHead>
                  <TableHead className="w-28 text-right">রেট/Mbps</TableHead>
                  <TableHead className="w-32">হতে</TableHead>
                  <TableHead className="w-32">পর্যন্ত</TableHead>
                  <TableHead className="w-20 text-right">দিন</TableHead>
                  <TableHead className="w-20 text-right">মাসের দিন</TableHead>
                  <TableHead className="w-28 text-right">মোট</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        value={line.service_name}
                        placeholder="Internet / NIX..."
                        onChange={(e) => updateLine(i, "service_name", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        value={line.bandwidth_mbps}
                        onChange={(e) =>
                          updateLine(i, "bandwidth_mbps", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        type="number"
                        value={line.rate}
                        onChange={(e) => updateLine(i, "rate", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        type="date"
                        value={line.period_start}
                        onChange={(e) => updateLine(i, "period_start", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs"
                        type="date"
                        value={line.period_end}
                        onChange={(e) => updateLine(i, "period_end", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs text-right"
                        type="number"
                        value={line.days}
                        onChange={(e) => updateLine(i, "days", Number(e.target.value))}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs text-right"
                        type="number"
                        value={line.total_days_in_month}
                        onChange={(e) =>
                          updateLine(i, "total_days_in_month", Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      ৳{Number(line.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {lines.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeLine(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={7} className="text-right">
                    সর্বমোট:
                  </TableCell>
                  <TableCell className="text-right text-primary">
                    ৳{grandTotal.toLocaleString()}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardContent className="pt-6">
          <label className="text-sm font-medium">মন্তব্য</label>
          <Textarea
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="মন্তব্য লিখুন..."
            rows={3}
            className="mt-1.5"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/dashboard/bw-buy/bills")}>
          বাতিল
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </div>
  );
}
