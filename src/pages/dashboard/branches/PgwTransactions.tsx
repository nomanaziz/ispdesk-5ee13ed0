import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Wallet, CreditCard, CheckCircle2, Search } from "lucide-react";
import PgwCashDialog from "@/components/branches/PgwCashDialog";
import PgwFundDialog from "@/components/branches/PgwFundDialog";

const fmt = (n: any) => `৳${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PgwTransactions() {
  const [tab, setTab] = useState("rollup");

  // Tab 1 state
  const [search, setSearch] = useState("");
  
  const [statusFilter, setStatusFilter] = useState("active");
  const [cashOpen, setCashOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);
  const [activePop, setActivePop] = useState<any>(null);
  const [activeRemaining, setActiveRemaining] = useState(0);

  // Tab 2/3 state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [settleTypeFilter, setSettleTypeFilter] = useState("all");
  const [popFilter, setPopFilter] = useState("all");

  // POP rollup
  const { data: rollup, isLoading: loadRollup } = useQuery({
    queryKey: ["pgw-pop-rollup"],
    queryFn: async () => {
      const { data: pops } = await supabase
        .from("branch_managers")
        .select("id, branch_id, pop_code, name, company_name, pop_type, phone, contact, status");
      const { data: payments } = await supabase
        .from("reseller_pgw_payments")
        .select("reseller_id, our_share, settled_amount");

      const map = new Map<string, { received: number; settled: number; remaining: number }>();
      (payments ?? []).forEach((p: any) => {
        const cur = map.get(p.reseller_id) || { received: 0, settled: 0, remaining: 0 };
        cur.received += Number(p.our_share || 0);
        cur.settled += Number(p.settled_amount || 0);
        cur.remaining = cur.received - cur.settled;
        map.set(p.reseller_id, cur);
      });
      return (pops ?? []).map((pop: any) => ({
        ...pop,
        ...(map.get(pop.id) || { received: 0, settled: 0, remaining: 0 }),
      }));
    },
  });

  const filteredRollup = useMemo(() => {
    return (rollup ?? []).filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.pop_code || ""} ${r.name || ""} ${r.company_name || ""} ${r.phone || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rollup, statusFilter, search]);

  const rollupTotals = useMemo(() => {
    return filteredRollup.reduce((acc: any, r: any) => ({
      received: acc.received + Number(r.received || 0),
      settled: acc.settled + Number(r.settled || 0),
      remaining: acc.remaining + Number(r.remaining || 0),
    }), { received: 0, settled: 0, remaining: 0 });
  }, [filteredRollup]);

  // Settlements history
  const { data: settlements } = useQuery({
    queryKey: ["pgw-settlements-history", fromDate, toDate, settleTypeFilter, popFilter],
    queryFn: async () => {
      let q = supabase
        .from("reseller_pgw_settlements")
        .select("*, branch_managers(pop_code, name)")
        .order("created_at", { ascending: false });
      if (fromDate) q = q.gte("payment_date", fromDate);
      if (toDate) q = q.lte("payment_date", toDate);
      if (settleTypeFilter !== "all") q = q.eq("settlement_type", settleTypeFilter);
      if (popFilter !== "all") q = q.eq("reseller_id", popFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  // POP transactions
  const { data: txns } = useQuery({
    queryKey: ["pgw-pop-transactions", fromDate, toDate, popFilter],
    queryFn: async () => {
      let q = supabase
        .from("reseller_pgw_payments")
        .select("*, branch_managers(pop_code, name)")
        .order("created_at", { ascending: false });
      if (fromDate) q = q.gte("created_at", fromDate);
      if (toDate) q = q.lte("created_at", toDate + "T23:59:59");
      if (popFilter !== "all") q = q.eq("reseller_id", popFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  const txnTotals = useMemo(() => {
    return (txns ?? []).reduce((acc: any, t: any) => ({
      paid: acc.paid + Number(t.our_share || 0),
      settled: acc.settled + Number(t.settled_amount || 0),
      remaining: acc.remaining + Number(t.remaining_amount || 0),
    }), { paid: 0, settled: 0, remaining: 0 });
  }, [txns]);

  const settleTotals = useMemo(() => {
    return (settlements ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  }, [settlements]);

  const settleTypeBadge = (t: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      auto: { label: "Auto Settled", cls: "bg-green-500/15 text-green-700 dark:text-green-400" },
      cash: { label: "Cash", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
      fund: { label: "Fund", cls: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
      manual: { label: "Manual", cls: "bg-muted text-foreground" },
    };
    const v = map[t] || map.manual;
    return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
  };

  const openCash = (pop: any) => { setActivePop(pop); setActiveRemaining(pop.remaining); setCashOpen(true); };
  const openFund = (pop: any) => { setActivePop(pop); setActiveRemaining(pop.remaining); setFundOpen(true); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">PGW ট্রানজেকশন</h1>
        <p className="text-sm text-muted-foreground">পেমেন্ট গেটওয়ে, সেটেলমেন্ট ও POP ট্রানজেকশন একসাথে</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="rollup"><Wallet className="h-4 w-4 mr-1" /> POP PGW</TabsTrigger>
          <TabsTrigger value="settlements"><CheckCircle2 className="h-4 w-4 mr-1" /> Settlement History</TabsTrigger>
          <TabsTrigger value="txns"><CreditCard className="h-4 w-4 mr-1" /> POP Transactions</TabsTrigger>
        </TabsList>

        {/* TAB 1 */}
        <TabsContent value="rollup">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Wallet className="h-5 w-5" /> POP PGW Rollup</span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="খুঁজুন (কোড / নাম / মোবাইল)" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={popTypeFilter} onValueChange={setPopTypeFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব Type</SelectItem>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="postpaid">Postpaid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadRollup ? (
                <p className="text-center text-muted-foreground py-8">লোড হচ্ছে...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>POP Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead className="text-right">Total Received</TableHead>
                        <TableHead className="text-right">Settled</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRollup.map((r: any) => {
                        const fully = r.remaining <= 0 && r.received > 0;
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono">{r.pop_code || "-"}</TableCell>
                            <TableCell className="font-medium">
                              {r.name}
                              {r.company_name && <div className="text-xs text-muted-foreground">{r.company_name}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={r.pop_type === "postpaid" ? "secondary" : "outline"}>
                                {r.pop_type === "postpaid" ? "Postpaid" : "Prepaid"}
                              </Badge>
                            </TableCell>
                            <TableCell>{r.phone || r.contact || "-"}</TableCell>
                            <TableCell className="text-right font-mono">{fmt(r.received)}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">{fmt(r.settled)}</TableCell>
                            <TableCell className="text-right font-mono text-primary font-semibold">{fmt(r.remaining)}</TableCell>
                            <TableCell>
                              {r.received <= 0 ? (
                                <Badge variant="outline">No Payment</Badge>
                              ) : fully ? (
                                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400" variant="outline">✓ Fully Settled</Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-1">
                                <Button size="sm" variant="outline" disabled={r.remaining <= 0} onClick={() => openCash(r)}>
                                  <Banknote className="h-3 w-3 mr-1" /> Cash
                                </Button>
                                <Button size="sm" disabled={r.remaining <= 0} onClick={() => openFund(r)}>
                                  <Wallet className="h-3 w-3 mr-1" /> Fund
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredRollup.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">কোনো POP নেই</TableCell></TableRow>
                      )}
                      {filteredRollup.length > 0 && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={4}>মোট</TableCell>
                          <TableCell className="text-right font-mono">{fmt(rollupTotals.received)}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{fmt(rollupTotals.settled)}</TableCell>
                          <TableCell className="text-right font-mono text-primary">{fmt(rollupTotals.remaining)}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="settlements">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Settlement History</CardTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <Select value={settleTypeFilter} onValueChange={setSettleTypeFilter}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব Type</SelectItem>
                    <SelectItem value="auto">Auto Settled</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="fund">Fund</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={popFilter} onValueChange={setPopFilter}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="POP" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব POP</SelectItem>
                    {(rollup ?? []).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>[{r.pop_code}] {r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>POP Code</TableHead>
                      <TableHead>POP Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference / Invoice</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(settlements ?? []).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.branch_managers?.pop_code || "-"}</TableCell>
                        <TableCell>{s.branch_managers?.name || "-"}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(s.amount)}</TableCell>
                        <TableCell className="font-mono text-xs">{s.reference || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{s.notes || "-"}</TableCell>
                        <TableCell>{s.payment_date || "-"}</TableCell>
                        <TableCell>{new Date(s.created_at).toLocaleDateString("bn-BD")}</TableCell>
                        <TableCell>{settleTypeBadge(s.settlement_type)}</TableCell>
                      </TableRow>
                    ))}
                    {(!settlements || settlements.length === 0) && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো settlement নেই</TableCell></TableRow>
                    )}
                    {settlements && settlements.length > 0 && (
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={2}>মোট</TableCell>
                        <TableCell className="text-right font-mono">{fmt(settleTotals)}</TableCell>
                        <TableCell colSpan={5}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 */}
        <TabsContent value="txns">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" /> POP Transactions</CardTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Input type="date" className="w-40" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <Input type="date" className="w-40" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <Select value={popFilter} onValueChange={setPopFilter}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="POP" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সব POP</SelectItem>
                    {(rollup ?? []).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>[{r.pop_code}] {r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>POP</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Paid Amount</TableHead>
                      <TableHead className="text-right">Our Share</TableHead>
                      <TableHead className="text-right">Settled</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trxn ID</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(txns ?? []).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.branch_managers?.name || "-"}</TableCell>
                        <TableCell>
                          {t.client_name || "-"}
                          {t.client_contact && <div className="text-xs text-muted-foreground">{t.client_contact}</div>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmt(t.total_amount)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(t.our_share)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{fmt(t.settled_amount)}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{fmt(t.remaining_amount)}</TableCell>
                        <TableCell><Badge variant="outline">{t.payment_method}</Badge></TableCell>
                        <TableCell>
                          {t.settlement_status === "settled" ? (
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400" variant="outline">Settled</Badge>
                          ) : t.settlement_status === "partial" ? (
                            <Badge variant="secondary">Partial</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{t.transaction_id || "-"}</TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleDateString("bn-BD")}</TableCell>
                      </TableRow>
                    ))}
                    {(!txns || txns.length === 0) && (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">কোনো ট্রানজেকশন নেই</TableCell></TableRow>
                    )}
                    {txns && txns.length > 0 && (
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={3}>মোট</TableCell>
                        <TableCell className="text-right font-mono">{fmt(txnTotals.paid)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{fmt(txnTotals.settled)}</TableCell>
                        <TableCell className="text-right font-mono text-primary">{fmt(txnTotals.remaining)}</TableCell>
                        <TableCell colSpan={4}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PgwCashDialog open={cashOpen} onOpenChange={setCashOpen} pop={activePop} remaining={activeRemaining} />
      <PgwFundDialog open={fundOpen} onOpenChange={setFundOpen} pop={activePop} remaining={activeRemaining} />
    </div>
  );
}
