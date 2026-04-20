import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  funding: any | null;
}

type SubRow = {
  id: string;
  reseller_name: string;
  paid_amount: number;
  discount: number;
  refund: number;
  trans_type: string;
  created_on: string | null;
  created_by: string | null;
  is_refund_row: boolean;
};

export default function FundingDetailDialog({ open, onOpenChange, funding }: Props) {
  const qc = useQueryClient();
  const branchId = funding?.branch_id;
  const invNo = funding?.invoice_number;

  // Fetch refund rows for this branch that reference this invoice in their remarks
  const { data: refunds } = useQuery({
    queryKey: ["funding-detail-refunds", branchId, invNo],
    enabled: !!open && !!branchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_funding")
        .select("*")
        .eq("branch_id", branchId)
        .eq("trans_type", "refund")
        .order("created_at", { ascending: true });
      return (data ?? []).filter((r: any) =>
        invNo ? (r.remarks ?? "").includes(invNo) : false,
      );
    },
  });

  const { data: empMap } = useQuery({
    queryKey: ["funding-detail-emps"],
    enabled: !!open,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name");
      const m: Record<string, string> = {};
      (data ?? []).forEach((e: any) => { m[e.id] = e.name; });
      return m;
    },
  });

  const rows: SubRow[] = useMemo(() => {
    if (!funding) return [];
    const list: SubRow[] = [];
    const resellerName = funding.branches?.name ?? "-";

    // Original fund row first
    list.push({
      id: funding.id,
      reseller_name: resellerName,
      paid_amount: Number(funding.received_amount ?? 0),
      discount: Number(funding.discount ?? 0),
      refund: 0,
      trans_type: "Fund",
      created_on: funding.created_at,
      created_by: funding.created_by ? empMap?.[funding.created_by] ?? "-" : "-",
      is_refund_row: false,
    });

    // Parse pay updates from remarks log: "[Pay ৳X on YYYY-MM-DD]"
    const remarks = funding.remarks ?? "";
    const payRegex = /\[Pay ৳(\d+(?:\.\d+)?) on (\d{4}-\d{2}-\d{2})\]/g;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = payRegex.exec(remarks)) !== null) {
      list.push({
        id: `${funding.id}-pay-${i++}`,
        reseller_name: resellerName,
        paid_amount: Number(m[1]),
        discount: 0,
        refund: 0,
        trans_type: "Payment",
        created_on: m[2],
        created_by: "-",
        is_refund_row: false,
      });
    }

    // Refund rows
    (refunds ?? []).forEach((r: any) => {
      list.push({
        id: r.id,
        reseller_name: resellerName,
        paid_amount: 0,
        discount: 0,
        refund: Number(r.amount ?? 0),
        trans_type: "Refund",
        created_on: r.created_at,
        created_by: r.received_by ? empMap?.[r.received_by] ?? "-" : "-",
        is_refund_row: true,
      });
    });

    return list;
  }, [funding, refunds, empMap]);

  const totals = useMemo(() => {
    const fundAmt = Number(funding?.amount ?? 0);
    let paid = 0, disc = 0, refundTotal = 0;
    rows.forEach((r) => {
      paid += r.paid_amount;
      disc += r.discount;
      refundTotal += r.refund;
    });
    const due = Math.max(0, fundAmt - paid - disc);
    return { fund: fundAmt, payment: paid, discount: disc, refund: refundTotal, due };
  }, [rows, funding]);

  const delRefund = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branch_funding").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funding-detail-refunds"] });
      qc.invalidateQueries({ queryKey: ["branch-funding"] });
      qc.invalidateQueries({ queryKey: ["pops-with-branch"] });
      toast.success("Refund undo করা হয়েছে — POP balance পুনরুদ্ধার");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!funding) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Debited Transaction History Of:{" "}
            <span className="font-mono text-primary">{funding.invoice_number ?? "-"}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Top summary card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-md border bg-muted/40 p-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Reseller</div>
            <div className="font-medium">{funding.branches?.name ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Invoice</div>
            <div className="font-mono">{funding.invoice_number ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Fund Date</div>
            <div>{funding.funding_date ? new Date(funding.funding_date).toLocaleDateString("en-GB") : "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Created By</div>
            <div>{funding.created_by ? empMap?.[funding.created_by] ?? "-" : "-"}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sr.</TableHead>
                <TableHead>Reseller Name</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Refund(-)</TableHead>
                <TableHead>Transaction Type</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{r.reseller_name}</TableCell>
                  <TableCell className="text-right font-mono">
                    {r.paid_amount ? `৳${r.paid_amount.toLocaleString("en-BD")}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.discount ? `৳${r.discount.toLocaleString("en-BD")}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive">
                    {r.refund ? `৳${r.refund.toLocaleString("en-BD")}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_refund_row ? "destructive" : "outline"}>
                      {r.trans_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.created_on ? new Date(r.created_on).toLocaleString("en-GB") : "-"}
                  </TableCell>
                  <TableCell className="text-xs">{r.created_by}</TableCell>
                  <TableCell>
                    {r.is_refund_row && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => {
                          if (confirm("Refund delete করলে POP balance ৳" + r.refund + " ফেরত যোগ হবে। নিশ্চিত?")) {
                            delRefund.mutate(r.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                    কোনো sub-entry নেই
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">Totals</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  ৳{totals.payment.toLocaleString("en-BD")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  ৳{totals.discount.toLocaleString("en-BD")}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-destructive">
                  ৳{totals.refund.toLocaleString("en-BD")}
                </TableCell>
                <TableCell colSpan={4} className="text-xs text-muted-foreground">
                  Fund: ৳{totals.fund.toLocaleString("en-BD")} | Due: ৳{totals.due.toLocaleString("en-BD")}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
