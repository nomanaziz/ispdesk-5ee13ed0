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
import { Plus, Trash2, ArrowLeft, Save, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface LineItem {
  id?: string;
  item_id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_percent: number;
  from_date: string;
  to_date: string;
  total: number;
}

const emptyLine = (): LineItem => ({
  item_id: "", description: "", unit: "Mbps", quantity: 1, rate: 0, vat_percent: 0, from_date: "", to_date: "", total: 0,
});

export default function BillForm() {
  const { id } = useParams();
  const isEdit = !!id && id !== "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    provider_id: "", bill_no: "", invoice_no: "", billing_month: "", payment_due: "",
    amount: 0, paid: "0", discount: "0", remarks: "", status: "unpaid",
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const { data: providers } = useQuery({
    queryKey: ["bw_providers_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_providers").select("id, name").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["bw_items_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bw_items").select("id, name, price, bandwidth").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Load existing bill for edit
  useQuery({
    queryKey: ["bw_bill_edit", id],
    queryFn: async () => {
      if (!isEdit) return null;
      const { data: bill, error } = await supabase.from("bw_purchase_bills").select("*").eq("id", id).single();
      if (error) throw error;
      setForm({
        provider_id: bill.provider_id || "",
        bill_no: bill.bill_no || "",
        invoice_no: bill.invoice_no || "",
        billing_month: bill.billing_month || bill.month || "",
        payment_due: bill.payment_due || "",
        amount: Number(bill.amount || 0),
        paid: String(bill.paid || 0),
        discount: String(bill.discount || 0),
        remarks: bill.remarks || "",
        status: bill.status || "unpaid",
      });
      // Load line items
      const { data: lineItems, error: lineError } = await supabase.from("bw_bill_items").select("*").eq("bill_id", id);
      if (lineError) throw lineError;
      if (lineItems && lineItems.length > 0) {
        setLines(lineItems.map((li: any) => ({
          id: li.id,
          item_id: li.item_id || "",
          description: li.description || "",
          unit: li.unit || "Mbps",
          quantity: Number(li.quantity || 1),
          rate: Number(li.rate || 0),
          vat_percent: Number(li.vat_percent || 0),
          from_date: li.from_date || "",
          to_date: li.to_date || "",
          total: Number(li.total || 0),
        })));
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
      setForm(f => ({ ...f, bill_no: billNo }));
    }
  }, [isEdit]);

  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    // Auto-calc total
    const qty = Number(updated[index].quantity || 0);
    const rate = Number(updated[index].rate || 0);
    const vat = Number(updated[index].vat_percent || 0);
    updated[index].total = qty * rate * (1 + vat / 100);
    setLines(updated);
  };

  const addLine = () => setLines([...lines, emptyLine()]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const grandTotal = lines.reduce((s, l) => s + l.total, 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.provider_id) throw new Error("প্রোভাইডার নির্বাচন করুন");
      if (!form.bill_no) throw new Error("বিল নম্বর আবশ্যক");

      let attachment_url = null;
      if (attachmentFile) {
        const ext = attachmentFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("bw-bill-attachments").upload(path, attachmentFile);
        if (error) throw error;
        const { data } = supabase.storage.from("bw-bill-attachments").getPublicUrl(path);
        attachment_url = data.publicUrl;
      }

      const payload: any = {
        provider_id: form.provider_id,
        bill_no: form.bill_no,
        invoice_no: form.invoice_no || null,
        billing_month: form.billing_month || null,
        month: form.billing_month || null,
        payment_due: form.payment_due || null,
        amount: grandTotal,
        paid: Number(form.paid || 0),
        discount: Number(form.discount || 0),
        remarks: form.remarks || null,
        status: form.status,
      };
      if (attachment_url) payload.attachment_url = attachment_url;

      let billId = id;
      if (isEdit) {
        const { error } = await supabase.from("bw_purchase_bills").update(payload).eq("id", id);
        if (error) throw error;
        // Delete old line items
        await supabase.from("bw_bill_items").delete().eq("bill_id", id!);
      } else {
        const { data, error } = await supabase.from("bw_purchase_bills").insert(payload).select("id").single();
        if (error) throw error;
        billId = data.id;
      }

      // Insert line items
      if (lines.length > 0 && lines.some(l => l.rate > 0)) {
        const linePayload = lines.filter(l => l.rate > 0).map(l => ({
          bill_id: billId!,
          item_id: l.item_id || null,
          description: l.description || null,
          unit: l.unit || "Mbps",
          quantity: l.quantity,
          rate: l.rate,
          vat_percent: l.vat_percent,
          from_date: l.from_date || null,
          to_date: l.to_date || null,
          total: l.total,
        }));
        const { error } = await supabase.from("bw_bill_items").insert(linePayload);
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
          <h1 className="text-2xl font-bold text-foreground">{isEdit ? "বিল সম্পাদনা" : "নতুন পার্চেজ বিল"}</h1>
          <p className="text-sm text-muted-foreground">ব্যান্ডউইথ ক্রয় — বিল ফর্ম</p>
        </div>
      </div>

      {/* Bill Header */}
      <Card>
        <CardHeader><CardTitle className="text-base">বিল তথ্য</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">প্রোভাইডার <span className="text-destructive">*</span></label>
              <Select value={form.provider_id} onValueChange={(v) => setForm({ ...form, provider_id: v })}>
                <SelectTrigger><SelectValue placeholder="প্রোভাইডার নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {(providers || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">বিল নং <span className="text-destructive">*</span></label>
              <Input value={form.bill_no} onChange={(e) => setForm({ ...form, bill_no: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ইনভয়েস নং</label>
              <Input value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">বিলিং মাস</label>
              <Input type="month" value={form.billing_month} onChange={(e) => setForm({ ...form, billing_month: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">পেমেন্ট ডিউ</label>
              <Input type="date" value={form.payment_due} onChange={(e) => setForm({ ...form, payment_due: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">স্ট্যাটাস</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ডিসকাউন্ট (৳)</label>
              <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">সংযুক্তি</label>
              <Input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">আইটেম সমূহ</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> আইটেম যোগ
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">আইটেম</TableHead>
                  <TableHead className="min-w-[120px]">বিবরণ</TableHead>
                  <TableHead className="w-20">ইউনিট</TableHead>
                  <TableHead className="w-20">পরিমাণ</TableHead>
                  <TableHead className="w-24">রেট</TableHead>
                  <TableHead className="w-20">VAT%</TableHead>
                  <TableHead className="w-32">হতে</TableHead>
                  <TableHead className="w-32">পর্যন্ত</TableHead>
                  <TableHead className="w-24 text-right">মোট</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select value={line.item_id} onValueChange={(v) => {
                        updateLine(i, "item_id", v === "none" ? "" : v);
                        const item = (items || []).find((it: any) => it.id === v);
                        if (item) {
                          updateLine(i, "rate", item.price || 0);
                          updateLine(i, "description", item.name);
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">নির্বাচন করুন</SelectItem>
                          {(items || []).map((it: any) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input className="h-8 text-xs" value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} /></TableCell>
                    <TableCell><Input className="h-8 text-xs" value={line.unit} onChange={(e) => updateLine(i, "unit", e.target.value)} /></TableCell>
                    <TableCell><Input className="h-8 text-xs" type="number" value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} /></TableCell>
                    <TableCell><Input className="h-8 text-xs" type="number" value={line.rate} onChange={(e) => updateLine(i, "rate", Number(e.target.value))} /></TableCell>
                    <TableCell><Input className="h-8 text-xs" type="number" value={line.vat_percent} onChange={(e) => updateLine(i, "vat_percent", Number(e.target.value))} /></TableCell>
                    <TableCell><Input className="h-8 text-xs" type="date" value={line.from_date} onChange={(e) => updateLine(i, "from_date", e.target.value)} /></TableCell>
                    <TableCell><Input className="h-8 text-xs" type="date" value={line.to_date} onChange={(e) => updateLine(i, "to_date", e.target.value)} /></TableCell>
                    <TableCell className="text-right font-medium text-sm">৳{line.total.toLocaleString()}</TableCell>
                    <TableCell>
                      {lines.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={8} className="text-right">সর্বমোট:</TableCell>
                  <TableCell className="text-right text-primary">৳{grandTotal.toLocaleString()}</TableCell>
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
          <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="মন্তব্য লিখুন..." rows={3} className="mt-1.5" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate("/dashboard/bw-buy/bills")}>বাতিল</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </div>
  );
}
