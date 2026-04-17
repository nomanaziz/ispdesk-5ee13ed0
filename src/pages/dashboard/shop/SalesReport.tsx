import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBDT } from "@/lib/shopUtils";
import { ShoppingBag, DollarSign, Package, TrendingUp } from "lucide-react";

export default function ShopSalesReport() {
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, paidRevenue: 0, pending: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: orders } = await supabase.from("shop_orders").select("*");
      const list = orders || [];
      setStats({
        totalOrders: list.length,
        totalRevenue: list.reduce((s: number, o: any) => s + Number(o.total), 0),
        paidRevenue: list.filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total), 0),
        pending: list.filter((o: any) => o.order_status === "pending").length,
      });
      setRecent(list.slice(0, 5));

      const { data: items } = await supabase.from("shop_order_items").select("name, quantity, subtotal").limit(1000);
      const map = new Map<string, { name: string; qty: number; revenue: number }>();
      (items || []).forEach((it: any) => {
        const e = map.get(it.name) || { name: it.name, qty: 0, revenue: 0 };
        e.qty += it.quantity; e.revenue += Number(it.subtotal);
        map.set(it.name, e);
      });
      setTopProducts(Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10));
    })();
  }, []);

  const cards = [
    { icon: ShoppingBag, label: "মোট অর্ডার", value: stats.totalOrders, color: "text-blue-600" },
    { icon: DollarSign, label: "মোট রেভিনিউ", value: formatBDT(stats.totalRevenue), color: "text-green-600" },
    { icon: TrendingUp, label: "পেইড রেভিনিউ", value: formatBDT(stats.paidRevenue), color: "text-emerald-600" },
    { icon: Package, label: "অপেক্ষমাণ অর্ডার", value: stats.pending, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <c.icon className={`h-8 w-8 ${c.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-xl font-bold">{c.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>টপ ১০ প্রোডাক্ট</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">প্রোডাক্ট</th><th className="text-right p-2">বিক্রি</th><th className="text-right p-2">রেভিনিউ</th></tr></thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-b"><td className="p-2">{p.name}</td><td className="text-right p-2">{p.qty}</td><td className="text-right p-2 font-medium">{formatBDT(p.revenue)}</td></tr>
                ))}
                {topProducts.length === 0 && <tr><td colSpan={3} className="text-center text-muted-foreground py-6">ডেটা নেই</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>সাম্প্রতিক অর্ডার</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left p-2">অর্ডার</th><th className="text-left p-2">কাস্টমার</th><th className="text-right p-2">মোট</th></tr></thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b"><td className="p-2 font-medium">{o.order_no}</td><td className="p-2">{o.customer_name}</td><td className="text-right p-2">{formatBDT(o.total)}</td></tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={3} className="text-center text-muted-foreground py-6">ডেটা নেই</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
