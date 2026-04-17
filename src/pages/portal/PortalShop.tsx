import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/shopUtils";
import { Search, Package as PackageIcon, ShieldCheck, Truck, ShoppingCart } from "lucide-react";
import { useCart } from "@/stores/useCart";
import { toast } from "sonner";

export default function PortalShop() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const addItem = useCart((s) => s.addItem);
  const cartCount = useCart((s) => s.count());

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("shop_products").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("shop_categories").select("id,name").eq("status", "active").order("sort_order"),
      ]);
      setProducts((p as any) || []);
      setCategories((c as any) || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) =>
      (cat === "all" || p.category_id === cat) &&
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase())),
    );
  }, [products, search, cat]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">শপ</h1>
          <p className="text-sm text-muted-foreground">আপনার পছন্দের প্রোডাক্ট অর্ডার করুন</p>
        </div>
        <Link to="/portal/checkout">
          <Button variant="outline" className="relative">
            <ShoppingCart className="h-4 w-4 mr-2" />
            কার্ট
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="প্রোডাক্ট খুঁজুন..." className="pl-9" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">সকল ক্যাটেগরি</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          কোনো প্রোডাক্ট পাওয়া যায়নি
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const img = Array.isArray(p.images) && p.images[0];
            return (
              <div key={p.id} className="bg-card rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-muted/30">
                  {img ? <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> :
                    <div className="flex items-center justify-center h-full"><PackageIcon className="h-12 w-12 opacity-20" /></div>}
                </div>
                <div className="p-3">
                  {p.brand && <p className="text-xs text-muted-foreground mb-1">{p.brand}</p>}
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-primary">{formatBDT(p.price)}</span>
                    {p.compare_price && p.compare_price > p.price && (
                      <span className="text-xs text-muted-foreground line-through">{formatBDT(p.compare_price)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {p.warranty_months > 0 && <Badge variant="secondary" className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />{p.warranty_months}মাস</Badge>}
                    {p.free_shipping && <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700"><Truck className="h-3 w-3 mr-1" />ফ্রি শিপিং</Badge>}
                  </div>
                  <Button size="sm" className="w-full" disabled={p.stock <= 0}
                    onClick={() => {
                      addItem({
                        productId: p.id, name: p.name, slug: p.slug, price: Number(p.price),
                        image: img || undefined, warrantyMonths: p.warranty_months || 0,
                        stock: p.stock, freeShipping: !!p.free_shipping,
                      });
                      toast.success("কার্টে যোগ হয়েছে");
                    }}>
                    {p.stock > 0 ? "কার্টে যোগ করুন" : "স্টক নেই"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
