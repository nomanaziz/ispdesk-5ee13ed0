import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, X, Plus } from "lucide-react";
import { slugify } from "@/lib/shopUtils";
import { toast } from "sonner";

export default function ShopProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = id && id !== "new";
  const [cats, setCats] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({
    sku: "", name: "", slug: "", category_id: "", brand: "",
    short_desc: "", long_desc: "", price: 0, compare_price: "",
    stock: 0, low_stock_alert: 5, unit: "pcs", weight_kg: 0,
    warranty_months: 12, images: [], specs: [], featured: false, status: "active",
  });

  useEffect(() => {
    supabase.from("shop_categories").select("id,name").order("name").then(({ data }) => setCats((data as any) || []));
    if (isEdit) {
      supabase.from("shop_products").select("*").eq("id", id!).maybeSingle().then(({ data }) => {
        if (data) setForm({
          ...data,
          compare_price: data.compare_price ?? "",
          images: Array.isArray(data.images) ? data.images : [],
          specs: Array.isArray(data.specs) ? data.specs : [],
        });
      });
    }
  }, [id, isEdit]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("shop-products").upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from("shop-products").getPublicUrl(path);
      setForm((f: any) => ({ ...f, images: [...f.images, pub.publicUrl] }));
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.name) { toast.error("নাম দিন"); return; }
    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      compare_price: form.compare_price === "" ? null : Number(form.compare_price),
      price: Number(form.price), stock: Number(form.stock),
      low_stock_alert: Number(form.low_stock_alert), weight_kg: Number(form.weight_kg),
      warranty_months: Number(form.warranty_months),
      category_id: form.category_id || null,
    };
    delete (payload as any).shop_categories;
    const { error } = isEdit
      ? await supabase.from("shop_products").update(payload).eq("id", id!)
      : await supabase.from("shop_products").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("সংরক্ষিত হয়েছে"); nav("/dashboard/shop/products");
  };

  const addSpec = () => setForm((f: any) => ({ ...f, specs: [...f.specs, { key: "", value: "" }] }));
  const updateSpec = (i: number, k: string, v: string) => setForm((f: any) => ({ ...f, specs: f.specs.map((s: any, idx: number) => idx === i ? { ...s, [k]: v } : s) }));
  const removeSpec = (i: number) => setForm((f: any) => ({ ...f, specs: f.specs.filter((_: any, idx: number) => idx !== i) }));

  return (
    <div className="space-y-4">
      <Link to="/dashboard/shop/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />প্রোডাক্ট তালিকায় ফিরুন
      </Link>
      <Card>
        <CardHeader><CardTitle>{isEdit ? "প্রোডাক্ট এডিট" : "নতুন প্রোডাক্ট"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: isEdit ? form.slug : slugify(e.target.value) })} /></div>
            <div><Label>স্লাগ</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>ব্র্যান্ড</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div>
              <Label>ক্যাটেগরি</Label>
              <select value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">— নির্বাচন করুন —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>ইউনিট</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><Label>দাম *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>কম্পেয়ার দাম</Label><Input type="number" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} /></div>
            <div><Label>স্টক</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div><Label>লো স্টক অ্যালার্ট</Label><Input type="number" value={form.low_stock_alert} onChange={(e) => setForm({ ...form, low_stock_alert: e.target.value })} /></div>
            <div><Label>ওজন (kg)</Label><Input type="number" step="0.01" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></div>
            <div><Label>ওয়ারেন্টি (মাস)</Label><Input type="number" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: e.target.value })} /></div>
            <div>
              <Label>স্ট্যাটাস</Label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
            <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /><span>Featured</span></label>
          </div>

          <div><Label>সংক্ষিপ্ত বিবরণ</Label><Textarea value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })} rows={2} /></div>
          <div><Label>বিস্তারিত বিবরণ</Label><Textarea value={form.long_desc} onChange={(e) => setForm({ ...form, long_desc: e.target.value })} rows={5} /></div>

          <div>
            <Label>প্রোডাক্ট ইমেজ</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.images.map((img: string, i: number) => (
                <div key={i} className="relative h-24 w-24 rounded border overflow-hidden">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_: any, idx: number) => idx !== i) })} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="h-24 w-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-xs text-muted-foreground">আপলোড হচ্ছে...</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>স্পেসিফিকেশন</Label>
              <Button type="button" size="sm" variant="outline" onClick={addSpec}><Plus className="h-3 w-3 mr-1" />যোগ</Button>
            </div>
            <div className="space-y-2">
              {form.specs.map((s: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Key" value={s.key} onChange={(e) => updateSpec(i, "key", e.target.value)} />
                  <Input placeholder="Value" value={s.value} onChange={(e) => updateSpec(i, "value", e.target.value)} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeSpec(i)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save}>সংরক্ষণ</Button>
            <Link to="/dashboard/shop/products"><Button variant="outline">বাতিল</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
