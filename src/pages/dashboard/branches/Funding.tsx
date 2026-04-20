import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Banknote, Plus, Check, ChevronsUpDown, History, Filter, X, Eye, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import FundingPayDialog from "@/components/branches/FundingPayDialog";
import FundingDetailDialog from "@/components/branches/FundingDetailDialog";

type PopRow = {
  id: string;
  branch_id: string | null;
  name: string;
  pop_code: string | null;
  company_name: string | null;
  balance: number | null;
};

const PAYMENT_METHODS = ["Not Applicable", "Cash", "bKash", "Nagad", "Rocket", "Bank Transfer", "Cheque"];
const TRANS_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "due", label: "Due" },
  { value: "paid", label: "Paid" },
  { value: "refund", label: "Refund" },
];

export default function Funding() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [popPickerOpen, setPopPickerOpen] = useState(false);

  // Filters
  const [filterPopId, setFilterPopId] = useState("all");
  const [filterPopPickerOpen, setFilterPopPickerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterPaymentBy, setFilterPaymentBy] = useState("all");
  const [filterReceivedBy, setFilterReceivedBy] = useState("all");
  const [search, setSearch] = useState("");

  // Pay/Refund dialog
  const [payDialog, setPayDialog] = useState<{ open: boolean; row: any; mode: "pay" | "refund" }>({
    open: false,
    row: null,
    mode: "pay",
  });
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; row: any }>({ open: false, row: null });

  const today = new Date().toISOString().split("T")[0];
  const initialForm = {
    pop_id: "",
    branch_id: "",
    funding_amount: 0,
    received_amount: 0,
    discount: 0,
    invoice_number: "",
    received_by: "",
    received_on: today,
    payment_method: "Not Applicable",
    remarks: "",
  };
  const [form, setForm] = useState(initialForm);

  const { data: fundings, isLoading } = useQuery({
    queryKey: ["branch-funding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_funding")
        .select("*, branches(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: pops } = useQuery({
    queryKey: ["pops-with-branch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("id, branch_id, name, pop_code, company_name, balance")
        .order("pop_code", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PopRow[];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["receivers-employees"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").order("name");
      return data ?? [];
    },
  });

  const empMap = useMemo(() => {
    const m: Record<string, string> = {};
    (users ?? []).forEach((u: any) => { m[u.id] = u.name; });
    return m;
  }, [users]);

  const branchToPop = useMemo(() => {
    const m: Record<string, PopRow> = {};
    (pops ?? []).forEach((p) => { if (p.branch_id) m[p.branch_id] = p; });
    return m;
  }, [pops]);

  const selectedPop = useMemo(
    () => pops?.find((p) => p.id === form.pop_id),
    [pops, form.pop_id]
  );

  const filterSelectedPop = useMemo(
    () => pops?.find((p) => p.id === filterPopId),
    [pops, filterPopId]
  );

  const due = Math.max(0, Number(form.funding_amount) - Number(form.received_amount) - Number(form.discount));

  // Apply filters
  const filteredRows = useMemo(() => {
    let rows = fundings ?? [];

    if (filterPopId !== "all" && filterSelectedPop?.branch_id) {
      rows = rows.filter((f: any) => f.branch_id === filterSelectedPop.branch_id);
    }

    if (filterStatus !== "all") {
      rows = rows.filter((f: any) => {
        const dueAmt = Number(f.due_amount ?? 0);
        const tt = (f.trans_type ?? "").toLowerCase();
        if (filterStatus === "due") return dueAmt > 0 && tt !== "refund";
        if (filterStatus === "paid") return dueAmt <= 0 && tt !== "refund";
        if (filterStatus === "refund") return tt === "refund";
        return true;
      });
    }

    if (filterFrom) rows = rows.filter((f: any) => (f.received_on ?? f.funding_date ?? "") >= filterFrom);
    if (filterTo) rows = rows.filter((f: any) => (f.received_on ?? f.funding_date ?? "") <= filterTo);

    if (filterPaymentBy !== "all") {
      rows = rows.filter((f: any) => (f.payment_method ?? "") === filterPaymentBy);
    }
    if (filterReceivedBy !== "all") {
      rows = rows.filter((f: any) => f.received_by === filterReceivedBy);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((f: any) => {
        return (
          (f.invoice_number ?? "").toLowerCase().includes(s) ||
          (f.branches?.name ?? "").toLowerCase().includes(s) ||
          (f.remarks ?? "").toLowerCase().includes(s) ||
          (f.payment_method ?? "").toLowerCase().includes(s)
        );
      });
    }

    return rows;
  }, [fundings, filterPopId, filterSelectedPop, filterStatus, filterFrom, filterTo, filterPaymentBy, filterReceivedBy, search]);

  const totals = useMemo(() => {
    const t = { amount: 0, received: 0, fee: 0, vat: 0, discount: 0, due: 0 };
    filteredRows.forEach((f: any) => {
      t.amount += Number(f.amount ?? 0);
      t.received += Number(f.received_amount ?? 0);
      t.fee += Number(f.processing_fee ?? 0);
      t.vat += Number(f.vat ?? 0);
      t.discount += Number(f.discount ?? 0);
      t.due += Number(f.due_amount ?? 0);
    });
    return t;
  }, [filteredRows]);

  const clearFilters = () => {
    setFilterPopId("all");
    setFilterStatus("all");
    setFilterFrom("");
    setFilterTo("");
    setFilterPaymentBy("all");
    setFilterReceivedBy("all");
    setSearch("");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.pop_id) throw new Error("POP নির্বাচন করুন");
      if (!form.funding_amount || form.funding_amount <= 0) throw new Error("Funding amount দিন");
      if (form.received_amount < 0) throw new Error("Received amount valid নয়");

      const { error } = await supabase.from("branch_funding").insert({
        branch_id: selectedPop?.branch_id ?? null,
        amount: form.funding_amount,
        received_amount: form.received_amount,
        discount: form.discount,
        due_amount: due,
        invoice_number: form.invoice_number || null,
        received_by: form.received_by || null,
        received_on: form.received_on,
        funding_date: form.received_on,
        payment_method: form.payment_method,
        remarks: form.remarks || null,
        description: form.remarks || null,
        type: "credit",
        trans_type: "fund",
        status: "paid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-funding"] });
      qc.invalidateQueries({ queryKey: ["pops-with-branch"] });
      toast.success("ফান্ড যোগ হয়েছে — POP balance আপডেট করা হয়েছে");
      setOpen(false);
      setForm(initialForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (row: any) => {
      // Safe delete: refund rows handled via detail dialog
      if ((row.trans_type ?? "") === "refund") {
        throw new Error("Refund row সরাসরি delete করা যাবে না — Detail view থেকে মুছুন");
      }
      // Block if any payment received
      if (Number(row.received_amount ?? 0) > 0) {
        throw new Error("এই entry-র সাথে যুক্ত পেমেন্ট history আছে — আগে detail view থেকে সব sub-entry মুছুন, তারপর এটি delete করতে পারবেন");
      }
      // Block if any refund row references this invoice
      if (row.invoice_number && row.branch_id) {
        const { data: refs } = await supabase
          .from("branch_funding")
          .select("id, remarks")
          .eq("branch_id", row.branch_id)
          .eq("trans_type", "refund");
        const linked = (refs ?? []).some((r: any) => (r.remarks ?? "").includes(row.invoice_number));
        if (linked) {
          throw new Error("এই entry-র সাথে যুক্ত রিফান্ড history আছে — আগে detail view থেকে সব sub-entry মুছুন");
        }
      }
      const { error } = await supabase.from("branch_funding").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-funding"] });
      qc.invalidateQueries({ queryKey: ["pops-with-branch"] });
      toast.success("ডিলিট হয়েছে — POP balance আপডেট");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">MAC Reseller Funding</h1>
          <p className="text-sm text-muted-foreground">POP-কে ফান্ড দিন ও ফান্ডিং হিস্ট্রি দেখুন</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dashboard/branches/funding-history">
              <History className="h-4 w-4 mr-1" /> Fund History
            </Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Give Fund</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>নতুন ফান্ড এন্ট্রি</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Reseller / POP <span className="text-destructive">*</span></Label>
                  <Popover open={popPickerOpen} onOpenChange={setPopPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                        {selectedPop
                          ? `[${selectedPop.pop_code ?? "----"}] ${selectedPop.name}${selectedPop.company_name ? " — " + selectedPop.company_name : ""}`
                          : "POP বাছাই করুন (code বা name দিয়ে search করুন)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by code or name…" />
                        <CommandList>
                          <CommandEmpty>কোনো POP পাওয়া যায়নি</CommandEmpty>
                          <CommandGroup>
                            {pops?.map((p) => {
                              const label = `[${p.pop_code ?? "----"}] ${p.name}${p.company_name ? " — " + p.company_name : ""}`;
                              return (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.pop_code ?? ""} ${p.name} ${p.company_name ?? ""}`}
                                  onSelect={() => {
                                    setForm({ ...form, pop_id: p.id, branch_id: p.branch_id ?? "" });
                                    setPopPickerOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", form.pop_id === p.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex flex-col">
                                    <span className="text-sm">{label}</span>
                                    <span className="text-xs text-muted-foreground">
                                      Balance: ৳{Number(p.balance ?? 0).toLocaleString("en-BD")}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Funding Amount (৳) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={1} value={form.funding_amount || ""} onChange={(e) => setForm({ ...form, funding_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Received Amount (৳)</Label>
                  <Input type="number" min={0} value={form.received_amount || ""} onChange={(e) => setForm({ ...form, received_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Discount (৳)</Label>
                  <Input type="number" min={0} value={form.discount || ""} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Due (auto)</Label>
                  <Input value={`৳${due.toLocaleString("en-BD")}`} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Invoice Number (auto if blank)</Label>
                  <Input placeholder="FND-…" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
                </div>
                <div>
                  <Label>Received Date</Label>
                  <Input type="date" value={form.received_on} onChange={(e) => setForm({ ...form, received_on: e.target.value })} />
                </div>
                <div>
                  <Label>Received By</Label>
                  <Select value={form.received_by} onValueChange={(v) => setForm({ ...form, received_by: v })}>
                    <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                    <SelectContent>
                      {users?.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Remarks</Label>
                  <Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
                    {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> ফিল্টার
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>MAC Reseller</Label>
              <Popover open={filterPopPickerOpen} onOpenChange={setFilterPopPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {filterPopId === "all"
                      ? "Select MACReseller"
                      : filterSelectedPop
                      ? `[${filterSelectedPop.pop_code ?? "----"}] ${filterSelectedPop.name}`
                      : "Select"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search…" />
                    <CommandList>
                      <CommandEmpty>পাওয়া যায়নি</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => { setFilterPopId("all"); setFilterPopPickerOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", filterPopId === "all" ? "opacity-100" : "opacity-0")} />
                          সব Reseller
                        </CommandItem>
                        {pops?.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.pop_code ?? ""} ${p.name} ${p.company_name ?? ""}`}
                            onSelect={() => { setFilterPopId(p.id); setFilterPopPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", filterPopId === p.id ? "opacity-100" : "opacity-0")} />
                            [{p.pop_code ?? "----"}] {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Transaction Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANS_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>
            <div>
              <Label>Payment By (Method)</Label>
              <Select value={filterPaymentBy} onValueChange={setFilterPaymentBy}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_METHODS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Received By</Label>
              <Select value={filterReceivedBy} onValueChange={setFilterReceivedBy}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {users?.map((u: any) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2 flex items-end justify-end gap-2">
              <Button variant="destructive" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" /> সাম্প্রতিক ফান্ডিং ({filteredRows.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ResellerName</TableHead>
                    <TableHead>InvoiceNumber</TableHead>
                    <TableHead className="text-right">FundAmount</TableHead>
                    <TableHead className="text-right">Payment</TableHead>
                    <TableHead className="text-right">P.Fee</TableHead>
                    <TableHead className="text-right">Vat</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">DueAmount</TableHead>
                    <TableHead>FundingDate</TableHead>
                    <TableHead>FundGivenBy</TableHead>
                    <TableHead>ReceivedDate</TableHead>
                    <TableHead>ReceivedBy</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Trans.Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((f: any) => {
                    const dueAmt = Number(f.due_amount ?? 0);
                    const isRefund = (f.trans_type ?? "") === "refund";
                    const isPaid = !isRefund && dueAmt <= 0;
                    return (
                      <TableRow key={f.id}>
                        <TableCell>{f.branches?.name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{f.invoice_number || "-"}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(f.amount ?? 0).toLocaleString("en-BD")}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(f.received_amount ?? 0).toLocaleString("en-BD")}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(f.processing_fee ?? 0).toLocaleString("en-BD")}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(f.vat ?? 0).toLocaleString("en-BD")}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(f.discount ?? 0).toLocaleString("en-BD")}</TableCell>
                        <TableCell className="text-right font-mono text-destructive">৳{dueAmt.toLocaleString("en-BD")}</TableCell>
                        <TableCell className="text-xs">{f.funding_date ? new Date(f.funding_date).toLocaleDateString("en-GB") : "-"}</TableCell>
                        <TableCell className="text-xs">{f.created_by ? empMap[f.created_by] ?? "-" : "-"}</TableCell>
                        <TableCell className="text-xs">{f.received_on ? new Date(f.received_on).toLocaleDateString("en-GB") : "-"}</TableCell>
                        <TableCell className="text-xs">{f.received_by ? empMap[f.received_by] ?? "-" : "-"}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={f.remarks ?? ""}>{f.remarks || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {isRefund ? (
                              <Badge variant="outline" className="border-destructive/50 text-destructive">Refund</Badge>
                            ) : (
                              <>
                                {dueAmt > 0 && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => setPayDialog({ open: true, row: f, mode: "pay" })}
                                  >
                                    Pay
                                  </Button>
                                )}
                                {dueAmt > 0 && (
                                  <Badge variant="destructive" className="text-xs">Due</Badge>
                                )}
                                {isPaid && (
                                  <Badge className="bg-success text-success-foreground text-xs">Paid</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setPayDialog({ open: true, row: f, mode: "refund" })}
                                >
                                  Refund
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setDetailDialog({ open: true, row: f })}
                              title="View detail history"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => {
                                const amt = Number(f.amount ?? 0);
                                const msg = (f.trans_type ?? "") === "refund"
                                  ? "Refund row সরাসরি delete করা যাবে না — Detail view থেকে মুছুন।"
                                  : `এই Fund entry delete করলে POP balance ৳${amt.toLocaleString("en-BD")} কমানো হবে। নিশ্চিত?`;
                                if ((f.trans_type ?? "") === "refund") {
                                  toast.error(msg);
                                  return;
                                }
                                if (confirm(msg)) del.mutate(f);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center text-muted-foreground py-8">কোনো ফান্ডিং নেই</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {filteredRows.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-mono font-semibold">৳{totals.amount.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">৳{totals.received.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">৳{totals.fee.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">৳{totals.vat.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">৳{totals.discount.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-destructive">৳{totals.due.toLocaleString("en-BD")}</TableCell>
                      <TableCell colSpan={7}></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FundingPayDialog
        open={payDialog.open}
        onOpenChange={(v) => setPayDialog((p) => ({ ...p, open: v }))}
        funding={payDialog.row}
        mode={payDialog.mode}
      />
    </div>
  );
}
