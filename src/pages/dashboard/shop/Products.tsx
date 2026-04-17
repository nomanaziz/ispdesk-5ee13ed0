import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { formatBDT } from "@/lib/shopUtils";
import { toast } from "sonner";

export default function ShopProducts() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("shop_products").select("*, shop_categories(name)").order("created_at", { ascending: false });
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("ডিলিট করবেন?")) return;
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const filtered = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>প্রোডাক্ট তালিকা</CardTitle>
        <Link to="/dashboard/shop/products/new"><Button><Plus className="h-4 w-4 mr-1" />নতুন প্রোডাক্ট</Button></Link>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="খুঁজুন..." className="pl-9" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ইমেজ</TableHead><TableHead>নাম</TableHead><TableHead>SKU</TableHead>
              <TableHead>ক্যাটেগরি</TableHead><TableHead>দাম</TableHead><TableHead>স্টক</TableHead>
              <TableHead>ওয়ারেন্টি</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const img = Array.isArray(p.images) && p.images[0];
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {img ? <img src={img} alt={p.name} className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 bg-muted rounded" />}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell>{p.shop_categories?.name || "—"}</TableCell>
                  <TableCell>{formatBDT(p.price)}</TableCell>
                  <TableCell>
                    <Badge variant={p.stock <= p.low_stock_alert ? "destructive" : "secondary"}>{p.stock}</Badge>
                  </TableCell>
                  <TableCell>{p.warranty_months} মাস</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Link to={`/dashboard/shop/products/${p.id}`}><Button size="sm" variant="ghost"><Edit className="h-4 w-4" /></Button></Link>
                    <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">কোনো প্রোডাক্ট নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
