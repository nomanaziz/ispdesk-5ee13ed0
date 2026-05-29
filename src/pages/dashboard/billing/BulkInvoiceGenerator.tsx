import { useEffect, useMemo, useState } from "react";
import { FileText, Play, Send, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { sendNotification } from "@/lib/notifications";
import { toast } from "sonner";

interface Preview {
  total: number;
  eligible: number;
  free: number;
  alreadyBilled: number;
  totalAmount: number;
}

export default function BulkInvoiceGenerator() {
  const { tenantId } = useTenant();
  const [month, setMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ sent: number; failed: number } | null>(null);

  const monthDate = `${month}-01`;

  const loadPreview = async () => {
    setLoadingPreview(true);
    setResult(null);
    setSmsResult(null);
    const { data: clients } = await supabase
      .from("clients")
      .select("id, monthly_bill, billing_status, status")
      .or("status.eq.active,status.eq.Active,status.eq.ACTIVE");
    const { data: existing } = await supabase
      .from("billing").select("client_id").eq("month", monthDate);
    const existingSet = new Set((existing || []).map((b: any) => b.client_id));

    let eligible = 0, free = 0, alreadyBilled = 0, total = 0;
    (clients || []).forEach((c: any) => {
      const bs = String(c.billing_status || "").toLowerCase();
      if (existingSet.has(c.id)) { alreadyBilled++; return; }
      if (bs === "left" || bs === "inactive" || bs === "personal") return;
      if (bs === "free") { free++; total += 500; }
      else { eligible++; total += Number(c.monthly_bill || 0); }
    });
    setPreview({ total: (clients || []).length, eligible, free, alreadyBilled, totalAmount: total });
    setLoadingPreview(false);
    loadRecent();
  };

  const loadRecent = async () => {
    const { data } = await supabase
      .from("billing").select("bill_id, amount, status, due_date, client_id, clients(name, phone_number)")
      .eq("month", monthDate).order("id", { ascending: false }).limit(50);
    setRecentBills((data || []) as any);
  };

  useEffect(() => { loadPreview(); /* eslint-disable-line */ }, [month]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-monthly-billing", { body: { month: monthDate } });
      if (error) throw error;
      setResult(data);
      toast.success(data?.message || "সম্পন্ন");
      loadRecent();
      loadPreview();
    } catch (e: any) { toast.error(e.message); }
    setGenerating(false);
  };

  const sendBillSms = async () => {
    if (!tenantId) return toast.error("Tenant resolve হচ্ছে না");
    if (!recentBills.length) return toast.error("কোনো bill নেই");
    setSendingSms(true);
    setSmsResult(null);
    let sent = 0, failed = 0;
    for (const b of recentBills) {
      const phone = (b as any).clients?.phone_number;
      if (!phone || b.status === "paid") { continue; }
      try {
        await sendNotification({
          tenant_id: tenantId, channel: "sms", recipient: phone,
          template_category: "bill_reminder",
          variables: {
            client_name: (b as any).clients?.name || "গ্রাহক",
            amount: String(b.amount), due_date: b.due_date || "",
          },
          context: { bill_id: b.bill_id },
        });
        sent++;
      } catch { failed++; }
    }
    setSmsResult({ sent, failed });
    toast.success(`SMS: ${sent} পাঠানো, ${failed} ব্যর্থ`);
    setSendingSms(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">বাল্ক ইনভয়েস জেনারেটর</h1>
          <p className="text-xs text-muted-foreground">বিলিং &gt; বাল্ক জেনারেট</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> মাস নির্বাচন</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs">মাস</Label>
              <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
            </div>
            <Button variant="outline" onClick={loadPreview} disabled={loadingPreview}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingPreview ? "animate-spin" : ""}`} /> Preview
            </Button>
          </div>

          {preview && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="মোট অ্যাকটিভ" value={preview.total} />
              <Stat label="নতুন বিল হবে" value={preview.eligible} highlight />
              <Stat label="ফ্রি" value={preview.free} />
              <Stat label="আগেই হয়েছে" value={preview.alreadyBilled} muted />
              <Stat label="মোট টাকা (৳)" value={preview.totalAmount.toLocaleString("bn-BD")} highlight />
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={generate} disabled={generating || !preview?.eligible}>
              <Play className="h-4 w-4 mr-1" /> {generating ? "জেনারেট করা হচ্ছে..." : `${preview?.eligible || 0} টি বিল তৈরি করুন`}
            </Button>
            <Button variant="outline" onClick={sendBillSms} disabled={sendingSms || !recentBills.length}>
              <Send className="h-4 w-4 mr-1" /> {sendingSms ? "পাঠানো হচ্ছে..." : "সবাইকে SMS রিমাইন্ডার"}
            </Button>
          </div>

          {result && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              ✅ {result.message} {result.generated ? `· নরমাল ${result.normalBills || 0} · ফ্রি ${result.freeBills || 0}` : ""}
            </div>
          )}
          {smsResult && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              📨 SMS: {smsResult.sent} পাঠানো, {smsResult.failed} ব্যর্থ
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">এই মাসের সাম্প্রতিক বিল ({recentBills.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Bill ID</TableHead><TableHead>গ্রাহক</TableHead><TableHead>ফোন</TableHead>
              <TableHead className="text-right">টাকা</TableHead><TableHead>Due</TableHead><TableHead>স্ট্যাটাস</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {recentBills.length === 0
                ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">কোনো বিল নেই</TableCell></TableRow>
                : recentBills.map((b: any) => (
                  <TableRow key={b.bill_id}>
                    <TableCell className="font-mono text-xs">{b.bill_id}</TableCell>
                    <TableCell>{b.clients?.name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.clients?.phone_number || "-"}</TableCell>
                    <TableCell className="text-right">৳{Number(b.amount).toLocaleString("bn-BD")}</TableCell>
                    <TableCell className="text-xs">{b.due_date || "-"}</TableCell>
                    <TableCell><Badge variant={b.status === "paid" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight, muted }: { label: string; value: any; highlight?: boolean; muted?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? "bg-primary/10 border-primary/30" : muted ? "bg-muted/50" : "bg-card"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
