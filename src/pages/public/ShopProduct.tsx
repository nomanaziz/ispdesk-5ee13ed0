import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/shopUtils";
import { useCart } from "@/stores/useCart";
import { toast } from "sonner";
import { ShieldCheck, Package as PackageIcon, ArrowLeft, Minus, Plus } from "lucide-react";

export default function ShopProduct() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("shop_products").select("*").eq("slug", slug!).maybeSingle();
      setP(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">লোড হচ্ছে...</div>;
  if (!p) return <div className="max-w-7xl mx-auto px-4 py-16 text-center">প্রোডাক্ট পাওয়া যায়নি। <Link to="/shop" className="text-cyan-700">শপে ফিরুন</Link></div>;

  const images: string[] = Array.isArray(p.images) ? p.images : [];
  const specs: { key: string; value: string }[] = Array.isArray(p.specs) ? p.specs : [];

  const handleAdd = () => {
    addItem({ productId: p.id, name: p.name, slug: p.slug, price: p.price, image: images[0], warrantyMonths: p.warranty_months, stock: p.stock }, qty);
    toast.success("কার্টে যোগ হয়েছে");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-cyan-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> শপে ফিরুন
      </Link>
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-slate-50 rounded-xl overflow-hidden mb-3 border">
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={p.name} className="w-full h-full object-contain" />
            ) : (
              <div className="flex items-center justify-center h-full"><PackageIcon className="h-24 w-24 text-slate-300" /></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`h-16 w-16 rounded-lg overflow-hidden border-2 ${activeImg === i ? "border-cyan-500" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {p.brand && <p className="text-sm text-slate-500 mb-1">{p.brand}</p>}
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{p.name}</h1>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-cyan-700">{formatBDT(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <span className="text-lg text-slate-400 line-through">{formatBDT(p.compare_price)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={p.stock > 0 ? "default" : "destructive"}>
              {p.stock > 0 ? `স্টকে: ${p.stock}` : "স্টক নেই"}
            </Badge>
            {p.warranty_months > 0 && (
              <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" />{p.warranty_months} মাস ওয়ারেন্টি</Badge>
            )}
          </div>
          {p.short_desc && <p className="text-slate-600 mb-4">{p.short_desc}</p>}

          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium">পরিমাণ:</span>
            <div className="flex items-center border rounded-lg">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
              <span className="px-4 font-medium">{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock, qty + 1))} className="p-2 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex gap-3 mb-6">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 flex-1" disabled={p.stock <= 0} onClick={handleAdd}>
              কার্টে যোগ করুন
            </Button>
            <Button size="lg" variant="outline" disabled={p.stock <= 0} onClick={() => { handleAdd(); nav("/checkout"); }}>
              এখনই কিনুন
            </Button>
          </div>

          {p.long_desc && (
            <div className="prose prose-sm max-w-none mb-6">
              <h3 className="font-semibold text-slate-900">বিবরণ</h3>
              <p className="text-slate-600 whitespace-pre-wrap">{p.long_desc}</p>
            </div>
          )}

          {specs.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">স্পেসিফিকেশন</h3>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <tbody>
                  {specs.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 bg-slate-50 font-medium w-1/3">{s.key}</td>
                      <td className="px-3 py-2">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
