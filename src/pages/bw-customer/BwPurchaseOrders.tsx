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
import { ShoppingCart, ArrowUpCircle, ArrowDownCircle, Info } from "lucide-react";
import { toast } from "sonner";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

type Mode = "upgrade" | "downgrade" | null;

export default function BwServiceOrders() {
  const { customer } = usePortalAuth();
  const billingId = getBillingCustomerId(customer);
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>(null);
  const [bandwidth, setBandwidth] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [note, setNote] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["bw-service-orders", billingId],
    enabled: !!billingId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_purchase_orders")
        .select("*, bw_purchase_order_items(*)")
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

  const openUpgrade = () => {
    setMode("upgrade");
    setBandwidth("");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setNote("");
  };
  const openDowngrade = () => {
    setMode("downgrade");
    setBandwidth("");
    setEffectiveDate(minDownDate);
    setNote("");
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!billingId || !mode) throw new Error("Not ready");
      if (!bandwidth.trim()) throw new Error("Bandwidth is required");
      if (mode === "downgrade" && effectiveDate < minDownDate) {
        throw new Error("Downgrade requires at least 30 days notice");
      }
      const order_no = `SO-${Date.now().toString().slice(-8)}`;
      const { error } = await supabase.from("bw_purchase_orders").insert({
        reseller_id: billingId,
        order_no,
        status: "pending",
        total: 0,
        request_type: mode,
        effective_date: effectiveDate,
        note: `[${mode.toUpperCase()}] Requested bandwidth: ${bandwidth}${note ? `\n\n${note}` : ""}`,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request submitted");
      setMode(null);
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
            ব্যান্ডউইথ আপগ্রেড অথবা ডাউনগ্রেডের অনুরোধ পাঠান।
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openUpgrade} className="gap-1.5">
            <ArrowUpCircle className="h-4 w-4" /> Bandwidth Upgrade
          </Button>
          <Button onClick={openDowngrade} variant="outline" className="gap-1.5">
            <ArrowDownCircle className="h-4 w-4" /> Bandwidth Downgrade
          </Button>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>আপগ্রেড</strong> instant approve হলে সাথে সাথে কার্যকর হয়।
          <strong> ডাউনগ্রেড</strong> এর জন্য কমপক্ষে <strong>৩০ দিন আগে</strong> নোটিশ দিতে হবে।
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">সকল অর্ডার ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-2" />
              এখনও কোনো সার্ভিস অর্ডার নেই
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
                    <TableHead className="text-right">মোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.order_no}</TableCell>
                      <TableCell>
                        {o.request_type ? (
                          <Badge
                            variant={o.request_type === "upgrade" ? "default" : "secondary"}
                            className="gap-1 text-[10px]"
                          >
                            {o.request_type === "upgrade"
                              ? <ArrowUpCircle className="h-3 w-3" />
                              : <ArrowDownCircle className="h-3 w-3" />}
                            {o.request_type}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>
                        {o.effective_date ? new Date(o.effective_date).toLocaleDateString("en-GB") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={o.status === "approved" ? "default" : "secondary"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{tk(o.total)}</TableCell>
                    </TableRow>
                  ))}
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
              {mode === "upgrade"
                ? <><ArrowUpCircle className="h-5 w-5 text-emerald-600" /> Bandwidth Upgrade Request</>
                : <><ArrowDownCircle className="h-5 w-5 text-amber-600" /> Bandwidth Downgrade Request</>}
            </DialogTitle>
            <DialogDescription>
              {mode === "upgrade"
                ? "Approve হলে সাথে সাথে কার্যকর হবে এবং প্রো-রেটেড বিল আসবে।"
                : "ডাউনগ্রেডের জন্য কমপক্ষে ৩০ দিন আগে অনুরোধ দিতে হবে।"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Requested Bandwidth (e.g. 100 Mbps)</Label>
              <Input value={bandwidth} onChange={(e) => setBandwidth(e.target.value)} placeholder="100 Mbps" />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={effectiveDate}
                min={mode === "downgrade" ? minDownDate : undefined}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
              {mode === "downgrade" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  সর্বনিম্ন তারিখ: {new Date(minDownDate).toLocaleDateString("en-GB")} (আজ + ৩০ দিন)
                </p>
              )}
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
