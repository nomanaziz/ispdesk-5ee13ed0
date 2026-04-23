import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

const tk = (n: number | null | undefined) =>
  `৳ ${(Number(n) || 0).toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;

export default function BwPurchaseOrders() {
  const { customer } = usePortalAuth();
  const billingId = getBillingCustomerId(customer);

  const { data: orders = [] } = useQuery({
    queryKey: ["bw-purchase-orders", billingId],
    enabled: !!billingId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_purchase_orders")
        .select("*, bw_purchase_order_items(*)")
        .eq("reseller_id", billingId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" /> পার্চেজ অর্ডার
        </h1>
        <p className="text-sm text-muted-foreground">
          আপনার ব্যান্ডউইথ কেনার অর্ডার ও স্ট্যাটাস
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">সকল অর্ডার ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-2" />
              এখনও কোনো পার্চেজ অর্ডার নেই
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>অর্ডার নং</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>আইটেম</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.order_no}</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>
                        {o.bw_purchase_order_items?.length || 0} items
                      </TableCell>
                      <TableCell>
                        <Badge variant={o.status === "approved" ? "default" : "secondary"}>
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{tk(o.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
