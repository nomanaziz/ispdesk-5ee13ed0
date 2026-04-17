import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/stores/useCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { BD_DISTRICTS, formatBDT, isInsideDhaka } from "@/lib/shopUtils";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2, "নাম দিন").max(100),
  mobile: z.string().trim().regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন"),
  email: z.string().trim().email("সঠিক ইমেইল দিন").max(255).optional().or(z.literal("")),
  district: z.string().trim().min(1, "জেলা নির্বাচন করুন"),
  thana: z.string().trim().max(100).optional().or(z.literal("")),
  address: z.string().trim().min(5, "ঠিকানা দিন").max(500),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  trx_id: z.string().trim().max(100).optional().or(z.literal("")),
});

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_name: "", mobile: "", email: "", district: "", thana: "",
    address: "", notes: "", trx_id: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from("shop_shipping_zones").select("*").then(({ data }) => setZones((data as any) || []));
  }, []);

  const inside = isInsideDhaka(form.district);
  const shipping = useMemo(() => {
    const zone = zones.find((z) => z.name.toLowerCase().includes(inside ? "inside" : "outside"));
    return zone ? Number(zone.charge) : inside ? 80 : 150;
  }, [zones, inside]);

  const sub = subtotal();
  const total = sub + (form.district ? shipping : 0);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="mb-4 text-slate-600">কার্টে কোনো প্রোডাক্ট নেই</p>
        <Link to="/shop"><Button>শপে যান</Button></Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "ভুল আছে");
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase
        .from("shop_orders")
        .insert({
          order_no: "",
          customer_name: parsed.data.customer_name,
          mobile: parsed.data.mobile,
          email: parsed.data.email || null,
          address: parsed.data.address,
          district: parsed.data.district,
          thana: parsed.data.thana || null,
          inside_dhaka: inside,
          subtotal: sub,
          shipping,
          discount: 0,
          total,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "cod" ? "pending" : "pending",
          order_status: "pending",
          trx_id: parsed.data.trx_id || null,
          notes: parsed.data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      const orderItems = items.map((it) => ({
        order_id: order.id, product_id: it.productId, name: it.name,
        price: it.price, quantity: it.quantity, subtotal: it.price * it.quantity,
        warranty_months: it.warrantyMonths,
      }));
      const { error: e2 } = await supabase.from("shop_order_items").insert(orderItems);
      if (e2) throw e2;

      clear();
      toast.success("অর্ডার সফল হয়েছে!");
      nav(`/order/${order.id}/track`);
    } catch (err: any) {
      toast.error(err.message || "অর্ডার ব্যর্থ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">চেকআউট</h1>
      <form onSubmit={onSubmit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">শিপিং তথ্য</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>পূর্ণ নাম *</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>মোবাইল *</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="01XXXXXXXXX" /></div>
            <div><Label>ইমেইল</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>জেলা *</Label>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">নির্বাচন করুন</option>
                {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><Label>থানা/উপজেলা</Label><Input value={form.thana} onChange={(e) => setForm({ ...form, thana: e.target.value })} /></div>
          </div>
          <div><Label>সম্পূর্ণ ঠিকানা *</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} /></div>
          <div><Label>অর্ডার নোট</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

          <div className="pt-3 border-t">
            <h2 className="font-semibold text-slate-900 mb-3">পেমেন্ট মেথড</h2>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="cod" /> <span className="font-medium">ক্যাশ অন ডেলিভারি (COD)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="bkash" /> <span className="font-medium">bKash</span> <span className="text-xs text-slate-500">(01XXXXXXXXX)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="nagad" /> <span className="font-medium">Nagad</span>
              </label>
            </RadioGroup>
            {paymentMethod !== "cod" && (
              <div className="mt-3"><Label>Transaction ID</Label><Input value={form.trx_id} onChange={(e) => setForm({ ...form, trx_id: e.target.value })} placeholder="পেমেন্ট পাঠানোর পর TrxID লিখুন" /></div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit sticky top-24">
          <h2 className="font-semibold text-slate-900 mb-4">অর্ডার সারমর্ম</h2>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {items.map((it) => (
              <div key={it.productId} className="flex justify-between text-sm">
                <span className="text-slate-700 line-clamp-1">{it.name} × {it.quantity}</span>
                <span className="font-medium">{formatBDT(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>সাবটোটাল</span><span>{formatBDT(sub)}</span></div>
            <div className="flex justify-between"><span>শিপিং ({inside ? "ঢাকার ভেতর" : form.district ? "ঢাকার বাইরে" : "—"})</span><span>{form.district ? formatBDT(shipping) : "—"}</span></div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>মোট</span><span className="text-cyan-700">{formatBDT(total)}</span></div>
          </div>
          <Button type="submit" disabled={submitting} className="w-full mt-4 bg-orange-500 hover:bg-orange-600">
            {submitting ? "অর্ডার করা হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}
          </Button>
        </div>
      </form>
    </div>
  );
}
