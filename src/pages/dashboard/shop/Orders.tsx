import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Search } from "lucide-react";
import { formatBDT } from "@/lib/shopUtils";

export default function ShopOrders() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    const { data } = await supabase.from("shop_orders").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((o) =>
    (statusFilter === "all" || o.order_status === statusFilter) &&
    (search === "" || o.order_no.toLowerCase().includes(search.toLowerCase()) || o.mobile.includes(search) || o.customer_name.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <Card>
      <CardHeader><CardTitle>অর্ডার তালিকা</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="অর্ডার নং / মোবাইল / নাম" className="pl-9" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">সকল স্ট্যাটাস</option>
            <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option><option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>অর্ডার নং</TableHead><TableHead>তারিখ</TableHead><TableHead>কাস্টমার</TableHead>
              <TableHead>মোবাইল</TableHead><TableHead>মোট</TableHead><TableHead>পেমেন্ট</TableHead>
              <TableHead>স্ট্যাটাস</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.order_no}</TableCell>
                <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{o.customer_name}</TableCell>
                <TableCell>{o.mobile}</TableCell>
                <TableCell>{formatBDT(o.total)}</TableCell>
                <TableCell><Badge variant={o.payment_status === "paid" ? "default" : "secondary"}>{o.payment_status}</Badge></TableCell>
                <TableCell><Badge>{o.order_status}</Badge></TableCell>
                <TableCell><Link to={`/dashboard/shop/orders/${o.id}`}><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো অর্ডার নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
