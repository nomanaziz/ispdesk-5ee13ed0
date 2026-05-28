import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Banknote, FileSpreadsheet, FileText, Plus, Search, Clock, X, CheckCircle2 } from "lucide-react";
import { usePopScope } from "@/hooks/usePopScope";
import { callPortal } from "@/lib/portalApi";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyCollection() {
  const queryClient = useQueryClient();
  const { isPopMode, branchId } = usePopScope();
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [collectForm, setCollectForm] = useState({ amount: "", discount: "0", payment_method: "Cash", note: "" });

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["bill-collections", fromDate, toDate, branchId || "all", isPopMode ? "pop" : "admin"],
    queryFn: async () => {
      if (isPopMode) {
        const res = await callPortal<{ collections: any[] }>("list_pop_daily_collections", { fromDate, toDate });
        return res.collections || [];
      }
      const { data, error } = await supabase
        .from("bill_collections")
        .select(`
          *, 
          client:clients!inner(id, client_id, name, contact, username, monthly_bill, branch_id, owner_scope),
          billing:billing(id, month, amount, paid, due, status)
        `)
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      let rows = data || [];
      if (isPopMode && branchId) rows = rows.filter((r: any) => r.client?.branch_id === branchId);
      else rows = rows.filter((r: any) => r.client?.owner_scope === "admin");
      return rows;
    },
  });

  const { data: clientsList = [] } = useQuery({
    queryKey: ["clients-for-billing", clientSearch, branchId || "all", isPopMode ? "pop" : "admin"],
    enabled: receiveOpen && clientSearch.length >= 2,
    queryFn: async () => {
      if (isPopMode) {
        const res = await callPortal<{ clients: any[] }>("list_pop_clients", { search: clientSearch, minimal: true });
        return res.clients || [];
      }
      let q: any = supabase
        .from("clients")
        .select("id, client_id, name, contact, username, monthly_bill")
        .eq("status", "active")
        .or(`client_id.ilike.%${clientSearch}%,name.ilike.%${clientSearch}%,contact.ilike.%${clientSearch}%`)
        .limit(20);
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      else q = q.eq("owner_scope", "admin");
      const { data } = await q;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return collections.filter((c: any) => {
      if (paymentMethodFilter !== "all" && c.payment_method !== paymentMethodFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [collections, paymentMethodFilter, statusFilter]);

  const summary = useMemo(() => {
    let received = 0, discount = 0, due = 0;
    filtered.forEach((c: any) => {
      received += Number(c.amount || 0);
      discount += Number(c.discount || 0);
      due += Number(c.billing?.due || 0);
    });
    return { received, discount, due };
  }, [filtered]);

  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("ক্লায়েন্ট নির্বাচন করুন");
      const amount = Number(collectForm.amount);
      const discount = Number(collectForm.discount || 0);
      if (!amount || amount <= 0) throw new Error("সঠিক পরিমাণ দিন");

      if (isPopMode) {
        return callPortal("receive_pop_bill", {
          client_id: selectedClient.id,
          amount,
          discount,
          payment_method: collectForm.payment_method,
          note: collectForm.note,
          received_date: today(),
          set_next_billing: true,
        });
      }

      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthKey = monthStart.slice(0, 7);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);
      const { data: billingRows } = await supabase
        .from("billing")
        .select("id, amount, paid, due, discount")
        .eq("client_id", selectedClient.id)
        .gte("month", monthStart)
        .lt("month", nextMonth)
        .order("month", { ascending: false })
        .limit(1);

      let billing = billingRows?.[0];
      // Auto-create current month bill if missing so Billing List reflects this receive
      if (!billing) {
        const billAmount = Number(selectedClient.monthly_bill || 0);
        const { data: newBill, error: createErr } = await supabase.from("billing").insert({
          bill_id: `BILL-${selectedClient.client_id}-${monthKey}`,
          client_id: selectedClient.id,
          month: monthStart,
          amount: billAmount,
          due: billAmount,
          paid: 0,
          status: "unpaid",
          generated: true,
        }).select("id, amount, paid, due, discount").maybeSingle();
        if (createErr) throw createErr;
        billing = newBill || undefined;
      }

      let billingId = billing?.id || null;
      if (billing) {
        const newPaid = Number(billing.paid || 0) + amount;
        const totalDiscount = Number(billing.discount || 0) + discount;
        const newDue = Math.max(0, Number(billing.amount || 0) - newPaid - totalDiscount);
        const newStatus = newDue <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        const { error: updErr } = await supabase.from("billing").update({
          paid: newPaid,
          due: newDue,
          discount: totalDiscount,
          status: newStatus,
          pay_date: today(),
          payment_method: collectForm.payment_method,
        }).eq("id", billing.id);
        if (updErr) throw updErr;
      }

      const { error: insertErr } = await supabase.from("bill_collections").insert({
        billing_id: billingId,
        client_id: selectedClient.id,
        amount,
        discount,
        payment_method: collectForm.payment_method,
        note: collectForm.note,
        status: "approved",
      });
      if (insertErr) throw insertErr;

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error: incomeError } = await supabase.from("income_entries").insert({
        amount,
        source: "bill_collection",
        description: `বিল কালেকশন — ${selectedClient.name} (${selectedClient.client_id || ""})`,
        income_date: today(),
        month: monthStart.slice(0, 7),
        client_id: selectedClient.id,
        payment_method: collectForm.payment_method,
        reference: billingId || null,
        received_by: userId || null,
        status: "approved",
      });
      if (incomeError) throw incomeError;
    },
    onSuccess: () => {
      toast({ title: "সফল", description: "বিল রিসিভ হয়েছে এবং আয়ে যোগ হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["bill-collections"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats-v3"] });
      queryClient.invalidateQueries({ queryKey: ["billing-list"] });
      setReceiveOpen(false);
      setSelectedClient(null);
      setCollectForm({ amount: "", discount: "0", payment_method: "Cash", note: "" });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold text-foreground">দৈনিক বিল কালেকশন (Daily Collection)</h1>

      <Tabs defaultValue="collected">
        <TabsList>
          <TabsTrigger value="collected">কালেক্টেড বিল</TabsTrigger>
          <TabsTrigger value="online">অপেক্ষমাণ অনলাইন পেমেন্ট</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="paybill">Paybill</TabsTrigger>
        </TabsList>

        <TabsContent value="collected" className="space-y-4 mt-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SummaryCard icon={Banknote} label="রিসিভড" value={`৳${summary.received.toLocaleString()}`} color="text-emerald-400" bg="bg-emerald-500/10" />
            <SummaryCard icon={Banknote} label="ডিস্কাউন্ট" value={`৳${summary.discount.toLocaleString()}`} color="text-orange-400" bg="bg-orange-500/10" />
            <SummaryCard icon={Banknote} label="বকেয়া" value={`৳${summary.due.toLocaleString()}`} color="text-red-400" bg="bg-red-500/10" />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline"><FileSpreadsheet className="h-4 w-4 mr-1" /> CSV</Button>
            <Button size="sm" variant="outline"><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            <Button size="sm" onClick={() => setReceiveOpen(true)}><Plus className="h-4 w-4 mr-1" /> রিসিভ বিল</Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />
            </div>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="পেমেন্ট" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল</SelectItem>
                {["Cash", "bKash", "Nagad", "Rocket", "Bank", "Online"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>তারিখ</TableHead>
                      <TableHead>C.Code</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>কাস্টমার নাম</TableHead>
                      <TableHead>মোবাইল</TableHead>
                      <TableHead>নোট</TableHead>
                      <TableHead className="text-right">M.Bill</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">কোনো কালেকশন পাওয়া যায়নি</TableCell></TableRow>
                    ) : filtered.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("bn-BD")}</TableCell>
                        <TableCell className="font-mono text-xs">{c.client?.client_id || "-"}</TableCell>
                        <TableCell className="text-xs">{c.client?.username || "-"}</TableCell>
                        <TableCell className="font-medium">{c.client?.name || "-"}</TableCell>
                        <TableCell>{c.client?.contact || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{c.note || "-"}</TableCell>
                        <TableCell className="text-right">{Number(c.client?.monthly_bill || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{Number(c.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Number(c.discount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{Number(c.billing?.due || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{c.payment_method}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={c.status === "approved" ? "default" : "secondary"} className="text-xs">
                            {c.status === "approved" ? "✓ Approved" : "Pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {filtered.length > 0 && (() => {
                    const t = filtered.reduce((a: any, c: any) => ({
                      mb: a.mb + Number(c.client?.monthly_bill || 0),
                      rec: a.rec + Number(c.amount || 0),
                      disc: a.disc + Number(c.discount || 0),
                      due: a.due + Number(c.billing?.due || 0),
                    }), { mb: 0, rec: 0, disc: 0, due: 0 });
                    return (
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={6} className="text-right">মোট ({filtered.length} টি):</TableCell>
                          <TableCell className="text-right">{t.mb.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{t.rec.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{t.disc.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{t.due.toLocaleString()}</TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableFooter>
                    );
                  })()}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online" className="mt-4">
          <PendingOnlinePayments />
        </TabsContent>

        <TabsContent value="webhook" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Webhook পেমেন্ট ডাটা এখানে দেখানো হবে</CardContent></Card>
        </TabsContent>
        <TabsContent value="paybill" className="mt-4">
          <Card><CardContent className="p-8 text-center text-muted-foreground">Paybill পেমেন্ট ডাটা এখানে দেখানো হবে</CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Receive Bill Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>বিল রিসিভ করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client search */}
            <div>
              <Label>ক্লায়েন্ট সার্চ</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ID / নাম / মোবাইল" className="pl-9" value={clientSearch} onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); }} />
              </div>
              {clientsList.length > 0 && !selectedClient && (
                <div className="border rounded-md mt-1 max-h-40 overflow-y-auto bg-popover">
                  {clientsList.map((cl: any) => (
                    <button key={cl.id} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between" onClick={() => { setSelectedClient(cl); setClientSearch(cl.client_id + " - " + cl.name); setCollectForm(f => ({ ...f, amount: String(cl.monthly_bill || 0) })); }}>
                      <span>{cl.client_id} — {cl.name}</span>
                      <span className="text-muted-foreground">{cl.contact}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <Card className="border-primary/30">
                <CardContent className="p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">নাম:</span><span className="font-medium">{selectedClient.name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">ID:</span><span>{selectedClient.client_id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">মাসিক বিল:</span><span className="font-bold">৳{Number(selectedClient.monthly_bill || 0).toLocaleString()}</span></div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>পরিমাণ (৳)</Label>
                <Input type="number" value={collectForm.amount} onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>ডিস্কাউন্ট</Label>
                <Input type="number" value={collectForm.discount} onChange={e => setCollectForm(f => ({ ...f, discount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>পেমেন্ট মেথড</Label>
              <Select value={collectForm.payment_method} onValueChange={v => setCollectForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Cash", "bKash", "Nagad", "Rocket", "Bank", "Online"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>নোট</Label>
              <Textarea value={collectForm.note} onChange={e => setCollectForm(f => ({ ...f, note: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>বাতিল</Button>
            <Button onClick={() => receiveMutation.mutate()} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending ? "সেভ হচ্ছে..." : "রিসিভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string; color: string; bg: string }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingOnlinePayments() {
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["public-payment-requests", statusTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_payment_requests")
        .select("*, client:clients(id, client_id, name, contact, monthly_bill)")
        .eq("status", statusTab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (req: any) => {
      const amt = Number(req.amount || 0);

      // Client self-recharge flow — skip bill update, run RPC
      if (req.purpose === "client_recharge" && req.recharge_days) {
        const { error: rpcErr } = await supabase.rpc("pop_recharge_client_days", {
          p_client_id: req.client_id,
          p_days: Number(req.recharge_days),
        });
        if (rpcErr) throw rpcErr;
        const { error: updErr } = await supabase
          .from("public_payment_requests")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", req.id);
        if (updErr) throw updErr;
        return;
      }

      const { data: billRows } = await supabase
        .from("billing")
        .select("id, amount, paid, due, status")
        .eq("client_id", req.client_id)
        .in("status", ["unpaid", "partial", "due"])
        .order("month", { ascending: true })
        .limit(1);

      const noteText = `অনলাইন পেমেন্ট • ${req.method} • Trx: ${req.trx_id || "-"}${req.sender_number ? ` • From: ${req.sender_number}` : ""}`;

      await supabase.from("bill_collections").insert({
        billing_id: billRows?.[0]?.id || null,
        client_id: req.client_id,
        amount: amt,
        discount: 0,
        payment_method: req.method,
        note: noteText,
        status: "approved",
        transaction_id: req.trx_id || null,
      });

      if (billRows?.[0]) {
        const b = billRows[0];
        const newPaid = Number(b.paid || 0) + amt;
        const newDue = Math.max(0, Number(b.amount || 0) - newPaid);
        const newStatus = newDue <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        await supabase.from("billing").update({
          paid: newPaid,
          due: newDue,
          status: newStatus,
          pay_date: today(),
        }).eq("id", b.id);
      }

      const { error } = await supabase
        .from("public_payment_requests")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", req.id);
      if (error) throw error;

      // Auto-enable MikroTik if client has no remaining due across all bills
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("id, mikrotik_id, username, billing_status, mikrotik_status")
          .eq("id", req.client_id)
          .maybeSingle();

        if (client?.mikrotik_id && client?.username) {
          const { data: openBills } = await supabase
            .from("billing")
            .select("due")
            .eq("client_id", req.client_id)
            .gt("due", 0);
          const totalDue = (openBills || []).reduce((s: number, b: any) => s + Number(b.due || 0), 0);

          if (totalDue <= 0) {
            await supabase.from("clients").update({
              billing_status: "Active",
              mikrotik_status: "enabled",
            }).eq("id", client.id);
            await supabase.functions.invoke("manage-mikrotik-ppp", {
              body: {
                client_id: client.id,
                mikrotik_id: client.mikrotik_id,
                username: client.username,
                action: "update",
                disabled: false,
              },
            });
          }
        }
      } catch (e) {
        console.error("auto re-enable mikrotik failed", e);
      }
    },
    onSuccess: () => {
      toast({ title: "অনুমোদিত", description: "পেমেন্ট approve হয়েছে এবং billing update হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["public-payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["bill-collections"] });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectFor) return;
      const { error } = await supabase
        .from("public_payment_requests")
        .update({ status: "rejected", admin_note: rejectNote || null, approved_at: new Date().toISOString() })
        .eq("id", rejectFor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "পেমেন্ট request reject হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["public-payment-requests"] });
      setRejectFor(null);
      setRejectNote("");
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const methodLabel = (m: string) => ({
    bank: "ব্যাংক",
    bkash_personal: "bKash (P)",
    nagad_personal: "Nagad (P)",
    bkash_merchant: "bKash (M)",
    nagad_merchant: "Nagad (M)",
    rechargeserver: "RS Gateway",
  } as any)[m] || m;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map(s => (
          <Button
            key={s}
            size="sm"
            variant={statusTab === s ? "default" : "outline"}
            onClick={() => setStatusTab(s)}
          >
            {s === "pending" && <Clock className="h-3.5 w-3.5 mr-1" />}
            {s === "approved" && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
            {s === "rejected" && <X className="h-3.5 w-3.5 mr-1" />}
            {s === "pending" ? "অপেক্ষমাণ" : s === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>C.Code</TableHead>
                  <TableHead>কাস্টমার</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>মেথড</TableHead>
                  <TableHead>Trx ID</TableHead>
                  <TableHead>প্রেরক</TableHead>
                  <TableHead className="text-right">পরিমাণ</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">কোনো {statusTab === "pending" ? "অপেক্ষমাণ" : statusTab} পেমেন্ট নেই</TableCell></TableRow>
                ) : requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("bn-BD")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.client?.client_id || "-"}</TableCell>
                    <TableCell className="font-medium">{r.client?.name || "-"}</TableCell>
                    <TableCell className="text-xs">{r.client?.contact || "-"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{methodLabel(r.method)}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.trx_id || "-"}</TableCell>
                    <TableCell className="text-xs">{r.sender_number || "-"}</TableCell>
                    <TableCell className="text-right font-bold">৳{Number(r.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {statusTab === "pending" ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" className="h-7" onClick={() => approveMutation.mutate(r)} disabled={approveMutation.isPending}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7" onClick={() => setRejectFor(r)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.admin_note || "-"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!rejectFor} onOpenChange={(v) => !v && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>পেমেন্ট Reject করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {rejectFor?.client?.name} — ৳{rejectFor?.amount} — Trx: {rejectFor?.trx_id}
            </p>
            <div>
              <Label>কারণ (ঐচ্ছিক)</Label>
              <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="যেমন: Trx ID মেলে নাই" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
