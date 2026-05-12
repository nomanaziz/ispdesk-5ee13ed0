import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, ArrowUpCircle, ArrowDownCircle, Info, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

type Mode = "upgrade" | "downgrade" | "discontinue" | null;

interface CurrentService {
  id: string;
  label: string;
  amount: number;
  bandwidth?: string;
  source: string;
}

export default function BwServiceOrders() {
  const { customer } = usePortalAuth();
  const billingId = getBillingCustomerId(customer);
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>(null);
  const [activeService, setActiveService] = useState<CurrentService | null>(null);
  const [bandwidth, setBandwidth] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [note, setNote] = useState("");

  // Current services derived from the most recent invoice(s)
  const { data: currentServices = [] } = useQuery<CurrentService[]>({
    queryKey: ["bw-current-services", billingId],
    enabled: !!billingId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sales_invoices")
        .select("id, invoice_no, total_amount, amount, billing_month, notes, special_note")
        .eq("customer_id", billingId!)
        .order("created_at", { ascending: false })
        .limit(1);
      const inv = (data || [])[0];
      if (!inv) return [];
      const text = `${inv.notes || ""} ${inv.special_note || ""}`;
      const m = text.match(/(\d+)\s*(Mbps|MB|Mb)/i);
      const bw = m ? `${m[1]} ${m[2]}` : undefined;
      return [{
        id: inv.id,
        label: bw ? `Internet Bandwidth — ${bw}` : `Internet Bandwidth (${inv.invoice_no})`,
        amount: Number(inv.total_amount || inv.amount || 0),
        bandwidth: bw,
        source: inv.invoice_no,
      }];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["bw-service-orders", billingId],
    enabled: !!billingId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_purchase_orders")
        .select("*")
        .eq("reseller_id", billingId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const minDownDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();
  const today = new Date().toISOString().slice(0, 10);

  const openMode = (m: Mode, svc: CurrentService) => {
    setMode(m);
    setActiveService(svc);
    setBandwidth("");
    setNote("");
    setEffectiveDate(m === "upgrade" ? today : minDownDate);
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!billingId || !mode || !activeService) throw new Error("Not ready");
      if (mode !== "discontinue" && !bandwidth.trim()) throw new Error("নতুন ব্যান্ডউইথ দিন");
      if ((mode === "downgrade" || mode === "discontinue") && effectiveDate < minDownDate) {
        throw new Error("কমপক্ষে ৩০ দিন পরের তারিখ দিন");
      }
      if (mode === "discontinue" && !note.trim()) throw new Error("কারণ লিখুন");

      const order_no = `SO-${Date.now().toString().slice(-8)}`;
      const cur = activeService.bandwidth || `(${activeService.source})`;
      const target = mode === "discontinue" ? "STOP" : bandwidth;
      const summary = `[${mode.toUpperCase()}] ${activeService.label}: ${cur} → ${target}`;

      const { data: order, error } = await supabase.from("bw_purchase_orders").insert({
        reseller_id: billingId,
        order_no,
        status: "pending",
        total: 0,
        request_type: mode,
        effective_date: effectiveDate,
        note: `${summary}${note ? `\n\n${note}` : ""}`,
      } as any).select("id").single();
      if (error) throw error;

      await supabase.from("bw_purchase_order_items").insert({
        order_id: order.id,
        item_name: activeService.label,
        description: summary,
        unit: "Mbps",
        quantity: mode === "discontinue" ? 0 : Number(bandwidth.replace(/[^\d.]/g, "")) || 0,
        rate: 0,
        total: 0,
      } as any);
    },
    onSuccess: () => {
      toast.success("অনুরোধ জমা হয়েছে");
      setMode(null); setActiveService(null);
      qc.invalidateQueries({ queryKey: ["bw-service-orders", billingId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" /> সার্ভিস অর্ডার
          </h1>
          <p className="text-sm text-muted-foreground">
            আপনার চলমান সার্ভিসগুলো — Upgrade, Downgrade অথবা Discontinue করতে পারবেন।
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Upgrade</strong> সাথে সাথে কার্যকর হয় (প্রো-রেটেড বিল)।{" "}
          <strong>Downgrade / Discontinue</strong> এর জন্য কমপক্ষে <strong>৩০ দিন</strong> আগে অনুরোধ দিতে হবে।
        </AlertDescription>
      </Alert>

      {/* Current services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" /> চলমান সার্ভিস
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              কোনো সক্রিয় ইনভয়েস/সার্ভিস পাওয়া যায়নি। admin এর সাথে যোগাযোগ করুন।
            </div>
          ) : (
            <div className="space-y-2">
              {currentServices.map((s) => (
                <div key={s.id} className="border rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground">
                      মাসিক: <span className="font-semibold text-foreground">{tk(s.amount)}</span>
                      {" · "}সর্বশেষ ইনভয়েস: <span className="font-mono">{s.source}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openMode("upgrade", s)} className="gap-1">
                      <ArrowUpCircle className="h-4 w-4" /> Upgrade
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openMode("downgrade", s)} className="gap-1">
                      <ArrowDownCircle className="h-4 w-4" /> Downgrade
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => openMode("discontinue", s)} className="gap-1">
                      <XCircle className="h-4 w-4" /> Discontinue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">সকল অনুরোধ ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-2" />
              এখনও কোনো অনুরোধ নেই
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>অর্ডার নং</TableHead>
                    <TableHead>টাইপ</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>কার্যকর তারিখ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => {
                    const t = o.request_type;
                    const variant = t === "upgrade" ? "default" : t === "discontinue" ? "destructive" : "secondary";
                    const Icon = t === "upgrade" ? ArrowUpCircle : t === "discontinue" ? XCircle : ArrowDownCircle;
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.order_no}</TableCell>
                        <TableCell>
                          {t ? (
                            <Badge variant={variant as any} className="gap-1 text-[10px]">
                              <Icon className="h-3 w-3" /> {t}
                            </Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                        <TableCell>{o.effective_date ? new Date(o.effective_date).toLocaleDateString("en-GB") : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={o.status === "approved" ? "default" : "secondary"}>{o.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "upgrade" && <><ArrowUpCircle className="h-5 w-5 text-emerald-600" /> Bandwidth Upgrade</>}
              {mode === "downgrade" && <><ArrowDownCircle className="h-5 w-5 text-amber-600" /> Bandwidth Downgrade</>}
              {mode === "discontinue" && <><XCircle className="h-5 w-5 text-destructive" /> Service Discontinue</>}
            </DialogTitle>
            <DialogDescription>
              {activeService && (
                <>সার্ভিস: <strong>{activeService.label}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {mode !== "discontinue" && (
              <div>
                <Label>নতুন ব্যান্ডউইথ (e.g. 100 Mbps)</Label>
                <Input value={bandwidth} onChange={(e) => setBandwidth(e.target.value)} placeholder="100 Mbps" />
              </div>
            )}
            <div>
              <Label>কার্যকর তারিখ (Effective Date)</Label>
              <Input
                type="date"
                value={effectiveDate}
                min={mode === "upgrade" ? today : minDownDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
              {mode !== "upgrade" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  সর্বনিম্ন: {new Date(minDownDate).toLocaleDateString("en-GB")} (আজ + ৩০ দিন)
                </p>
              )}
            </div>
            <div>
              <Label>{mode === "discontinue" ? "কারণ *" : "Note (optional)"}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>বাতিল</Button>
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              variant={mode === "discontinue" ? "destructive" : "default"}
            >
              {submit.isPending ? "জমা হচ্ছে..." : "অনুরোধ জমা দিন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
