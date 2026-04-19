import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ResellerPurchaseOrders = () => {
  const { customer } = usePortalAuth();
  const resellerId = getBillingCustomerId(customer);
  const qc = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ["reseller-purchase-orders", resellerId],
    enabled: !!resellerId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_purchase_orders")
        .select("*")
        .eq("reseller_id", resellerId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bw_purchase_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      qc.invalidateQueries({ queryKey: ["reseller-purchase-orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Purchase Orders</CardTitle>
          <Button asChild size="sm">
            <Link to="/reseller/purchases/new">
              <Plus className="h-4 w-4 mr-1" /> New Order
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr</TableHead>
                  <TableHead>Order No</TableHead>
                  <TableHead>Billing Month</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase orders
                    </TableCell>
                  </TableRow>
                )}
                {orders.map((o: any, i: number) => (
                  <TableRow key={o.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono">{o.order_no}</TableCell>
                    <TableCell>{o.billing_month || "—"}</TableCell>
                    <TableCell>{format(new Date(o.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">৳ {Number(o.total).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{o.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (confirm("Delete this order?")) del.mutate(o.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerPurchaseOrders;
