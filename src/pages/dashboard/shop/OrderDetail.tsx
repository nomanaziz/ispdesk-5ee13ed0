import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Printer } from "lucide-react";
import { formatBDT } from "@/lib/shopUtils";
import { toast } from "sonner";

export default function ShopOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const load = async () => {
    const [{ data: o }, { data: i }] = await Promise.all([
      supabase.from("shop_orders").select("*").eq("id", id!).maybeSingle(),
      supabase.from("shop_order_items").select("*").eq("order_id", id!),
    ]);
    setOrder(o); setItems((i as any) || []);
    if (o) { setOrderStatus(o.order_status); setPaymentStatus(o.payment_status); }
  };
  useEffect(() => { load(); }, [id]);

  const update = async () => {
    const { error } = await supabase.from("shop_orders").update({
      order_status: orderStatus, payment_status: paymentStatus,
    }).eq("id", id!);
    if (error) { toast.error(error.message); return; }
    toast.success("আপডেট হয়েছে"); load();
  };

  if (!order) return <div className="text-center py-16 text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/dashboard/shop/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />ফিরুন
        </Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />প্রিন্ট</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>অর্ডার #{order.order_no}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">কাস্টমার</h3>
              <p>{order.customer_name}</p>
              <p>{order.mobile}</p>
              {order.email && <p>{order.email}</p>}
            </div>
            <div>
              <h3 className="font-semibold mb-2">শিপিং ঠিকানা</h3>
              <p>{order.address}</p>
              <p>{order.thana ? order.thana + ", " : ""}{order.district}</p>
              <p className="text-muted-foreground">{order.inside_dhaka ? "ঢাকার ভেতর" : "ঢাকার বাইরে"}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">অর্ডার তথ্য</h3>
              <p>তারিখ: {new Date(order.created_at).toLocaleString()}</p>
              <p>পেমেন্ট: <span className="uppercase">{order.payment_method}</span></p>
              {order.trx_id && <p>TrxID: {order.trx_id}</p>}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">আইটেম</h3>
            <table className="w-full text-sm border">
              <thead className="bg-muted"><tr><th className="text-left p-2">প্রোডাক্ট</th><th className="text-right p-2">দাম</th><th className="text-right p-2">পরিমাণ</th><th className="text-right p-2">মোট</th><th className="text-left p-2">ওয়ারেন্টি</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.name}</td>
                    <td className="text-right p-2">{formatBDT(it.price)}</td>
                    <td className="text-right p-2">{it.quantity}</td>
                    <td className="text-right p-2 font-medium">{formatBDT(it.subtotal)}</td>
                    <td className="p-2 text-xs">
                      {it.warranty_months > 0 ? (
                        it.warranty_start ? `${it.warranty_start} → ${it.warranty_end}` : `${it.warranty_months} মাস (পেমেন্ট বাকি)`
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="text-right p-2">সাবটোটাল</td><td className="text-right p-2">{formatBDT(order.subtotal)}</td><td></td></tr>
                <tr><td colSpan={3} className="text-right p-2">শিপিং</td><td className="text-right p-2">{formatBDT(order.shipping)}</td><td></td></tr>
                <tr className="font-bold border-t"><td colSpan={3} className="text-right p-2">মোট</td><td className="text-right p-2">{formatBDT(order.total)}</td><td></td></tr>
              </tfoot>
            </table>
          </div>

          {order.notes && <div className="mt-4"><h3 className="font-semibold mb-1">নোট</h3><p className="text-sm text-muted-foreground">{order.notes}</p></div>}

          <div className="mt-6 grid md:grid-cols-3 gap-4 items-end print:hidden">
            <div>
              <Label>অর্ডার স্ট্যাটাস</Label>
              <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option><option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <Label>পেমেন্ট স্ট্যাটাস</Label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="pending">Pending</option><option value="paid">Paid</option>
                <option value="failed">Failed</option><option value="refunded">Refunded</option>
              </select>
            </div>
            <Button onClick={update}>আপডেট</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
