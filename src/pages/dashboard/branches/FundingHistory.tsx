import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { History, ArrowLeft, Check, ChevronsUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

type Tx = {
  id: string;
  reseller_name: string;
  invoice_number: string | null;
  receipt_number: string | null;
  trans_type: string;
  fund_in: number;
  refund_out: number;
  paid: number;
  processing_fee: number;
  vat: number;
  discount: number;
  due: number;
  remarks: string | null;
  received_on: string | null;
  received_by: string | null;
  created_on: string | null;
};

const TRANS_TYPES = [
  { value: "all", label: "সব" },
  { value: "fund", label: "Fund(+)" },
  { value: "refund", label: "Refund(-)" },
  { value: "received", label: "Received" },
  { value: "discount", label: "Discount" },
  { value: "advance", label: "Advance" },
];

export default function FundingHistory() {
  const [popId, setPopId] = useState<string>("all");
  const [popPickerOpen, setPopPickerOpen] = useState(false);
  const [transType, setTransType] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data: pops } = useQuery({
    queryKey: ["pops-list-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_managers")
        .select("id, branch_id, name, pop_code, company_name")
        .order("pop_code");
      return data ?? [];
    },
  });

  const selectedPop = useMemo(
    () => pops?.find((p: any) => p.id === popId),
    [pops, popId]
  );
  const selectedBranchId = selectedPop?.branch_id;

  const { data: rows, isLoading } = useQuery({
    queryKey: ["fund-history", popId, selectedBranchId, transType, fromDate, toDate],
    queryFn: async () => {
      // 1. branch_funding rows
      let q = supabase
        .from("branch_funding")
        .select("*, branches(name)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (popId !== "all" && selectedBranchId) q = q.eq("branch_id", selectedBranchId);
      if (transType !== "all") q = q.eq("trans_type", transType);
      if (fromDate) q = q.gte("received_on", fromDate);
      if (toDate) q = q.lte("received_on", toDate);
      const { data: funds, error } = await q;
      if (error) throw error;

      // 2. credit_refund_logs (treat as refund-style credit on POP balance)
      let cr = supabase
        .from("credit_refund_logs")
        .select("*, branch_managers(name, branch_id)")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (popId !== "all") cr = cr.eq("pop_id", popId);
      if (fromDate) cr = cr.gte("created_at", fromDate);
      if (toDate) cr = cr.lte("created_at", toDate + "T23:59:59");
      const { data: refunds } = await cr;

      const employeeIds = Array.from(
        new Set((funds ?? []).map((f: any) => f.received_by).filter(Boolean))
      ) as string[];
      let empMap: Record<string, string> = {};
      if (employeeIds.length) {
        const { data: emps } = await supabase
          .from("employees")
          .select("id, name")
          .in("id", employeeIds);
        empMap = Object.fromEntries((emps ?? []).map((e: any) => [e.id, e.name]));
      }

      const all: Tx[] = [];
      (funds ?? []).forEach((f: any) => {
        const isRefund = f.trans_type === "refund";
        all.push({
          id: f.id,
          reseller_name: f.branches?.name ?? "-",
          invoice_number: f.invoice_number,
          receipt_number: f.receipt_number,
          trans_type: f.trans_type ?? "fund",
          fund_in: isRefund ? 0 : Number(f.amount ?? 0),
          refund_out: isRefund ? Number(f.amount ?? 0) : 0,
          paid: Number(f.received_amount ?? 0),
          processing_fee: Number(f.processing_fee ?? 0),
          vat: Number(f.vat ?? 0),
          discount: Number(f.discount ?? 0),
          due: Number(f.due_amount ?? 0),
          remarks: f.remarks ?? f.description ?? null,
          received_on: f.received_on ?? f.funding_date,
          received_by: f.received_by ? empMap[f.received_by] ?? "-" : "-",
          created_on: f.created_at,
        });
      });

      if (transType === "all" || transType === "refund") {
        (refunds ?? []).forEach((r: any) => {
          if (popId !== "all" && r.pop_id !== popId) return;
          all.push({
            id: r.id,
            reseller_name: r.branch_managers?.name ?? "-",
            invoice_number: null,
            receipt_number: null,
            trans_type: "credit_refund",
            fund_in: Number(r.refund_amount ?? 0),
            refund_out: 0,
            paid: 0,
            processing_fee: 0,
            vat: 0,
            discount: 0,
            due: 0,
            remarks: r.reason ?? "Credit refund (left client)",
            received_on: r.created_at,
            received_by: "System",
            created_on: r.created_at,
          });
        });
      }

      return all.sort((a, b) =>
        (b.created_on ?? "").localeCompare(a.created_on ?? "")
      );
    },
  });

  const totals = useMemo(() => {
    const t = { fund_in: 0, refund_out: 0, paid: 0, processing_fee: 0, vat: 0, discount: 0, due: 0 };
    rows?.forEach((r) => {
      t.fund_in += r.fund_in;
      t.refund_out += r.refund_out;
      t.paid += r.paid;
      t.processing_fee += r.processing_fee;
      t.vat += r.vat;
      t.discount += r.discount;
      t.due += r.due;
    });
    return t;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6" /> MAC Reseller Fund History
          </h1>
          <p className="text-sm text-muted-foreground">সব ফান্ড / রিফান্ড / কালেকশনের বিস্তারিত ইতিহাস</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/dashboard/branches/funding"><ArrowLeft className="h-4 w-4 mr-1" /> ফান্ডিং পেইজ</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> ফিল্টার
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>MAC Reseller</Label>
              <Popover open={popPickerOpen} onOpenChange={setPopPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {popId === "all"
                      ? "সব Reseller"
                      : selectedPop
                      ? `[${selectedPop.pop_code ?? "----"}] ${selectedPop.name}`
                      : "বাছাই করুন"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search…" />
                    <CommandList>
                      <CommandEmpty>পাওয়া যায়নি</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => { setPopId("all"); setPopPickerOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", popId === "all" ? "opacity-100" : "opacity-0")} />
                          সব Reseller
                        </CommandItem>
                        {pops?.map((p: any) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.pop_code ?? ""} ${p.name} ${p.company_name ?? ""}`}
                            onSelect={() => { setPopId(p.id); setPopPickerOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", popId === p.id ? "opacity-100" : "opacity-0")} />
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
              <Label>Transaction Type</Label>
              <Select value={transType} onValueChange={setTransType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reseller</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Fund(+)</TableHead>
                    <TableHead className="text-right">Refund(-)</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">P.Fee</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Received On</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Created On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows?.map((r) => (
                    <TableRow key={`${r.trans_type}-${r.id}`}>
                      <TableCell>{r.reseller_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.invoice_number || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.receipt_number || "-"}</TableCell>
                      <TableCell><Badge variant="outline">{r.trans_type}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-success">{r.fund_in ? `৳${r.fund_in.toLocaleString("en-BD")}` : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{r.refund_out ? `৳${r.refund_out.toLocaleString("en-BD")}` : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{r.paid ? `৳${r.paid.toLocaleString("en-BD")}` : "-"}</TableCell>
                      <TableCell className="text-right font-mono">{r.processing_fee || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{r.vat || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{r.discount || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{r.due || "-"}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={r.remarks ?? ""}>{r.remarks || "-"}</TableCell>
                      <TableCell className="text-xs">{r.received_on ? new Date(r.received_on).toLocaleDateString("en-GB") : "-"}</TableCell>
                      <TableCell className="text-xs">{r.received_by || "-"}</TableCell>
                      <TableCell className="text-xs">{r.created_on ? new Date(r.created_on).toLocaleDateString("en-GB") : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(!rows || rows.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center text-muted-foreground py-8">কোনো ট্রানজেকশন পাওয়া যায়নি</TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {rows && rows.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="font-semibold">মোট</TableCell>
                      <TableCell className="text-right font-mono text-success">৳{totals.fund_in.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">৳{totals.refund_out.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono">৳{totals.paid.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono">৳{totals.processing_fee.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono">৳{totals.vat.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono">৳{totals.discount.toLocaleString("en-BD")}</TableCell>
                      <TableCell className="text-right font-mono">৳{totals.due.toLocaleString("en-BD")}</TableCell>
                      <TableCell colSpan={4}></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
