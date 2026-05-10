import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callPortal } from "@/lib/portalApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { exportCSV, exportPDF, fmtMoney, fmtDate, type Column } from "@/lib/reportExport";

interface Props {
  branchId: string | undefined;
  popName?: string;
  /** "pop" → fetch via portal-data (POP JWT). "admin" → direct REST (default). */
  mode?: "admin" | "pop";
}

export default function PopDebitHistory({ branchId, popName, mode = "admin" }: Props) {
  const today = new Date();
  const firstOfYear = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfYear);
  const [to, setTo] = useState(todayStr);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-debit-history", mode, branchId, from, to],
    enabled: mode === "pop" ? true : !!branchId,
    queryFn: async () => {
      if (mode === "pop") {
        const res = await callPortal<{ rows: any[] }>("pop_get_debit_history", { from, to });
        return res?.rows ?? [];
      }
      const { data, error } = await supabase
        .from("branch_funding")
        .select("*")
        .eq("branch_id", branchId!)
        .gte("funding_date", from)
        .lte("funding_date", to)
        .order("funding_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = rows.reduce(
    (acc, r: any) => {
      acc.amount += Number(r.amount) || 0;
      acc.received += Number(r.received_amount) || 0;
      acc.discount += Number(r.discount) || 0;
      acc.due += Number(r.due_amount) || 0;
      return acc;
    },
    { amount: 0, received: 0, discount: 0, due: 0 },
  );

  const columns: Column[] = [
    { key: "funding_date", label: "Funding Date", format: fmtDate },
    { key: "invoice_number", label: "Invoice" },
    { key: "trans_type", label: "Type" },
    { key: "amount", label: "Amount", format: fmtMoney },
    { key: "received_amount", label: "Total Paid", format: fmtMoney },
    { key: "discount", label: "Discount", format: fmtMoney },
    { key: "due_amount", label: "Total Due", format: fmtMoney },
    { key: "received_on", label: "Payment Date", format: fmtDate },
    { key: "payment_method", label: "Method" },
    { key: "remarks", label: "Remarks" },
  ];
  const title = `Debit (Fund) History - ${popName || "POP"} - ${from} to ${to}`;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => exportCSV(title, columns, rows)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportPDF(title, columns, rows)}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funding Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">লোড হচ্ছে...</TableCell></TableRow>
              )}
              {!isLoading && rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{fmtDate(r.funding_date)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.invoice_number || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={r.trans_type === "refund" ? "destructive" : "default"}>
                      {r.trans_type || "fund"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">৳{fmtMoney(r.amount)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">৳{fmtMoney(r.received_amount)}</TableCell>
                  <TableCell className="text-right font-mono">৳{fmtMoney(r.discount)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">৳{fmtMoney(r.due_amount)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.received_on)}</TableCell>
                  <TableCell className="text-xs">{r.payment_method || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={r.remarks}>{r.remarks || "-"}</TableCell>
                </TableRow>
              ))}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">এই date range-এ কোন funding history নেই</TableCell></TableRow>
              )}
              {rows.length > 0 && (
                <TableRow className="bg-muted/40 font-bold">
                  <TableCell colSpan={3} className="text-right">Total</TableCell>
                  <TableCell className="text-right font-mono">৳{fmtMoney(totals.amount)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">৳{fmtMoney(totals.received)}</TableCell>
                  <TableCell className="text-right font-mono">৳{fmtMoney(totals.discount)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">৳{fmtMoney(totals.due)}</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
