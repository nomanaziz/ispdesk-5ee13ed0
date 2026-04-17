import { useEffect, useState } from "react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT } from "@/lib/shopUtils";
import { Package as PackageIcon, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500",
  processing: "bg-blue-500",
  shipped: "bg-indigo-500",
  delivered: "bg-emerald-500",
  completed: "bg-emerald-700",
  cancelled: "bg-destructive",
};

export default function PortalMyOrders() {
  const { customer } = usePortalAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!customer?.sub) return;
    (async () => {
      const { data } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("client_id", customer.sub)
        .order("created_at", { ascending: false });
      setOrders((data as any) || []);
    })();
  }, [customer?.sub]);

  const toggle = async (orderId: string) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!items[orderId]) {
      const { data } = await supabase.from("shop_order_items").select("*").eq("order_id", orderId);
      setItems((m) => ({ ...m, [orderId]: (data as any) || [] }));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>আমার অর্ডারসমূহ</CardTitle>
        <Link to="/portal/shop"><Button size="sm" variant="outline">শপে যান</Button></Link>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            কোনো অর্ডার নেই
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>অর্ডার নং</TableHead>
                <TableHead>তারিখ</TableHead>
                <TableHead>আইটেম</TableHead>
                <TableHead>মোট</TableHead>
                <TableHead>পেমেন্ট</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <>
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => toggle(o.id)}>
                    <TableCell className="font-medium">{o.order_no}</TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.customer_name}</TableCell>
                    <TableCell>{formatBDT(o.total)}</TableCell>
                    <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>{o.payment_status}</Badge></TableCell>
                    <TableCell><Badge className={statusColor[o.order_status] || ""}>{o.order_status}</Badge></TableCell>
                  </TableRow>
                  {expandedId === o.id && (
                    <TableRow key={o.id + "-d"}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="p-3">
                          <div className="text-xs text-muted-foreground mb-2">ঠিকানা: {o.address} {o.district && `· ${o.district}`}</div>
                          <table className="w-full text-sm">
                            <thead className="text-xs text-muted-foreground">
                              <tr><th className="text-left">প্রোডাক্ট</th><th className="text-right">দাম</th><th className="text-right">পরিমাণ</th><th className="text-right">মোট</th><th className="text-left pl-2">ওয়ারেন্টি</th></tr>
                            </thead>
                            <tbody>
                              {(items[o.id] || []).map((it) => (
                                <tr key={it.id} className="border-t">
                                  <td className="py-1">{it.name}</td>
                                  <td className="text-right">{formatBDT(it.price)}</td>
                                  <td className="text-right">{it.quantity}</td>
                                  <td className="text-right font-medium">{formatBDT(it.subtotal)}</td>
                                  <td className="pl-2 text-xs">
                                    {it.warranty_months > 0 ? (
                                      it.warranty_start ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-700">
                                          <ShieldCheck className="h-3 w-3" />{it.warranty_start} → {it.warranty_end}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">{it.warranty_months} মাস (পেমেন্টের অপেক্ষায়)</span>
                                      )
                                    ) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
