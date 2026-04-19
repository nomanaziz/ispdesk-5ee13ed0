import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Printer, Wallet } from "lucide-react";
import PayBillDialog from "@/components/reseller/PayBillDialog";

const ResellerInvoices = () => {
  const { customer } = usePortalAuth();
  const resellerId = getBillingCustomerId(customer);
  const [payOpen, setPayOpen] = useState(false);
  const [activeInv, setActiveInv] = useState<any>(null);

  const { data: invoices = [], refetch } = useQuery({
    queryKey: ["reseller-invoices", resellerId],
    enabled: !!resellerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sales_invoices")
        .select("*")
        .eq("customer_id", resellerId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const openPay = (inv: any) => {
    setActiveInv(inv);
    setPayOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr</TableHead>
                  <TableHead>Bill No</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No invoices yet
                    </TableCell>
                  </TableRow>
                )}
                {invoices.map((inv: any, i: number) => {
                  const due = Number(inv.due ?? Math.max(0, Number(inv.amount || 0) - Number(inv.paid_amount || 0) - Number(inv.discount || 0)));
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>
                        <Link to={`/reseller/invoices/${inv.id}`} className="text-primary font-mono hover:underline">
                          {inv.invoice_no}
                        </Link>
                      </TableCell>
                      <TableCell>{inv.month || "—"}</TableCell>
                      <TableCell className="text-right">৳ {Number(inv.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳ {Number(inv.paid_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳ {Number(inv.discount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">৳ {due.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={due > 0 ? "destructive" : "default"}>
                          {due > 0 ? "Due" : "Paid"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                            <Link to={`/reseller/invoices/${inv.id}`} title="View">
                              <FileText className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                            <Link to={`/reseller/invoices/${inv.id}/print`} title="PDF">
                              <Printer className="h-4 w-4" />
                            </Link>
                          </Button>
                          {due > 0 && (
                            <Button size="sm" onClick={() => openPay({ ...inv, due })}>
                              <Wallet className="h-3.5 w-3.5 mr-1" /> Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {activeInv && (
        <PayBillDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          invoiceId={activeInv.id}
          invoiceNo={activeInv.invoice_no}
          due={activeInv.due}
          customerId={resellerId!}
          onPaid={refetch}
        />
      )}
    </div>
  );
};

export default ResellerInvoices;
