import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Banknote, FileSpreadsheet, FileText, Plus, Trash2, CheckCircle2, Search, Clock, X
} from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyCollection() {
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [collectForm, setCollectForm] = useState({ amount: "", discount: "0", payment_method: "Cash", note: "" });

  // Fetch collections
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["bill-collections", fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_collections")
        .select(`
          *, 
          client:clients(id, client_id, name, contact, username, monthly_bill),
          billing:billing(id, month, amount, paid, due, status)
        `)
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch clients for receive dialog
  const { data: clientsList = [] } = useQuery({
    queryKey: ["clients-for-billing", clientSearch],
    enabled: receiveOpen && clientSearch.length >= 2,
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, client_id, name, contact, username, monthly_bill")
        .eq("status", "active")
        .or(`client_id.ilike.%${clientSearch}%,name.ilike.%${clientSearch}%,contact.ilike.%${clientSearch}%`)
        .limit(20);
      return data || [];
    },
  });

  // Filter
  const filtered = useMemo(() => {
    return collections.filter((c: any) => {
      if (paymentMethodFilter !== "all" && c.payment_method !== paymentMethodFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [collections, paymentMethodFilter, statusFilter]);

  // Summary
  const summary = useMemo(() => {
    let received = 0, discount = 0, due = 0;
    filtered.forEach((c: any) => {
      received += Number(c.amount || 0);
      discount += Number(c.discount || 0);
      due += Number(c.billing?.due || 0);
    });
    return { received, discount, due };
  }, [filtered]);

  // Receive bill mutation
  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("ক্লায়েন্ট নির্বাচন করুন");
      const amount = Number(collectForm.amount);
      if (!amount || amount <= 0) throw new Error("সঠিক পরিমাণ দিন");

      // Get current month billing
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      const { data: billingRows } = await supabase
        .from("billing")
        .select("id, amount, paid, due")
        .eq("client_id", selectedClient.id)
        .eq("month", currentMonth)
        .limit(1);

      const billing = billingRows?.[0];

      // Insert collection
      const { error: insertErr } = await supabase.from("bill_collections").insert({
        billing_id: billing?.id || null,
        client_id: selectedClient.id,
        amount,
        discount: Number(collectForm.discount || 0),
        payment_method: collectForm.payment_method,
        note: collectForm.note,
        status: "approved",
      });
      if (insertErr) throw insertErr;

      // Update billing if exists
      if (billing) {
        const newPaid = Number(billing.paid || 0) + amount;
        const newDue = Number(billing.amount || 0) - newPaid - Number(collectForm.discount || 0);
        const newStatus = newDue <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        await supabase.from("billing").update({
          paid: newPaid,
          due: Math.max(0, newDue),
          discount: Number(collectForm.discount || 0),
          status: newStatus,
          pay_date: today(),
        }).eq("id", billing.id);
      }
    },
    onSuccess: () => {
      toast({ title: "সফল", description: "বিল রিসিভ হয়েছে" });
      queryClient.invalidateQueries({ queryKey: ["bill-collections"] });
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
