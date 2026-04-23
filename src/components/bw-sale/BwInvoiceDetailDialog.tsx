import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoiceId: string | null;
}

export default function BwInvoiceDetailDialog({ open, onOpenChange, invoiceId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["bw-invoice-detail-dialog", invoiceId],
    enabled: !!invoiceId && open,
    queryFn: async () => {
      const [inv, items] = await Promise.all([
        supabase
          .from("bw_sales_invoices")
          .select("*, bw_sale_customers(customer_name, customer_code)")
          .eq("id", invoiceId!)
          .maybeSingle(),
        supabase.from("bw_invoice_items").select("*").eq("invoice_id", invoiceId!).order("sort_order"),
      ]);
      return { inv: inv.data, items: items.data || [] };
    },
  });

  const inv = data?.inv;
  const amount = Number(inv?.amount || 0);
  const paid = Number(inv?.paid_amount || 0);
  const discount = Number(inv?.discount || 0);
  const due = Number(inv?.due ?? Math.max(0, amount - paid - discount));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8">
            <span>
              Invoice <span className="font-mono">{inv?.invoice_no || "—"}</span>
            </span>
            {inv && (
              <Button asChild size="sm" variant="outline">
                <a href={`/reseller/invoices/${inv.id}/print`} target="_blank" rel="noreferrer">
                  <Printer className="h-4 w-4 mr-1" /> Print / PDF
                </a>
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <div className="py-8 text-center text-muted-foreground">Loading...</div>}
        {!isLoading && !inv && <div className="py-8 text-center text-muted-foreground">Invoice not found</div>}

        {inv && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border rounded-md p-3 bg-muted/30">
              <Field label="Customer" v={(inv.bw_sale_customers as any)?.customer_name} />
              <Field label="Code" v={(inv.bw_sale_customers as any)?.customer_code} />
              <Field label="Month" v={inv.month || inv.billing_month} />
              <Field
                label="Status"
                v={<Badge variant={due > 0 ? "destructive" : "default"}>{due > 0 ? "Due" : "Paid"}</Badge>}
              />
            </div>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Mbps</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        No line items
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((it: any, i: number) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {it.service_name || it.item_name || it.description || "—"}
                        </TableCell>
                        <TableCell className="text-right">{Number(it.bandwidth_mbps || 0)}</TableCell>
                        <TableCell className="text-right">৳ {Number(it.rate || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {it.period_start
                            ? format(new Date(it.period_start), "dd MMM yyyy")
                            : it.from_date
                            ? format(new Date(it.from_date), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {it.period_end
                            ? format(new Date(it.period_end), "dd MMM yyyy")
                            : it.to_date
                            ? format(new Date(it.to_date), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {it.days || 0}
                          {it.total_days_in_month ? `/${it.total_days_in_month}` : ""}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ৳ {Number(it.amount || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-1 text-sm border rounded-md p-3">
                <Row label="Total" value={`৳ ${amount.toLocaleString()}`} />
                <Row label="Paid" value={`৳ ${paid.toLocaleString()}`} />
                <Row label="Discount" value={`৳ ${discount.toLocaleString()}`} />
                <div className="border-t pt-1 mt-1">
                  <Row
                    label="Due"
                    value={`৳ ${due.toLocaleString()}`}
                    bold
                    className={due > 0 ? "text-destructive" : ""}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const Field = ({ label, v }: { label: string; v?: any }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{v ?? "—"}</div>
  </div>
);

const Row = ({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) => (
  <div className={`flex items-center justify-between ${className || ""}`}>
    <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}</span>
    <span className={bold ? "font-bold" : "font-medium"}>{value}</span>
  </div>
);
