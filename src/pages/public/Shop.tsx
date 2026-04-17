import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/shopUtils";
import { Search, Package as PackageIcon, ShieldCheck } from "lucide-react";
import { useCart } from "@/stores/useCart";
import { toast } from "sonner";

interface Product {
  id: string; name: string; slug: string; price: number; compare_price: number | null;
  stock: number; warranty_months: number; images: any; brand: string | null;
  short_desc: string | null; category_id: string | null; status: string;
}
interface Category { id: string; name: string; slug: string; }

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"new" | "price_asc" | "price_desc">("new");
  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("shop_products").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("shop_categories").select("id,name,slug").eq("status", "active").order("sort_order"),
      ]);
      setProducts((p as any) || []);
      setCategories((c as any) || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) =>
      (cat === "all" || p.category_id === cat) &&
      (search === "" || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase())),
    );
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, search, cat, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">ISP প্রোডাক্ট শপ</h1>
        <p className="text-slate-600">ONU, রাউটার, OLT, SFP, প্যাচ কর্ড সহ সকল ISP equipment</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="প্রোডাক্ট খুঁজুন..." className="pl-9" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">সকল ক্যাটেগরি</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="new">নতুন আগে</option>
          <option value="price_asc">দাম: কম থেকে বেশি</option>
          <option value="price_desc">দাম: বেশি থেকে কম</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <PackageIcon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          কোনো প্রোডাক্ট পাওয়া যায়নি
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
            return (
              <div key={p.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                <Link to={`/shop/${p.slug}`} className="block aspect-square bg-slate-50 overflow-hidden">
                  {img ? (
                    <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><PackageIcon className="h-16 w-16 text-slate-300" /></div>
                  )}
                </Link>
                <div className="p-3">
                  {p.brand && <p className="text-xs text-slate-500 mb-1">{p.brand}</p>}
                  <Link to={`/shop/${p.slug}`} className="block">
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-2 mb-2 hover:text-cyan-700">{p.name}</h3>
                  </Link>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-cyan-700">{formatBDT(p.price)}</span>
                    {p.compare_price && p.compare_price > p.price && (
                      <span className="text-xs text-slate-400 line-through">{formatBDT(p.compare_price)}</span>
                    )}
                  </div>
                  {p.warranty_months > 0 && (
                    <Badge variant="secondary" className="mb-2 text-[10px]">
                      <ShieldCheck className="h-3 w-3 mr-1" />{p.warranty_months} মাস ওয়ারেন্টি
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={p.stock <= 0}
                    onClick={() => {
                      addItem({
                        productId: p.id, name: p.name, slug: p.slug, price: p.price,
                        image: img, warrantyMonths: p.warranty_months, stock: p.stock,
                      });
                      toast.success("কার্টে যোগ হয়েছে");
                    }}
                  >
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
