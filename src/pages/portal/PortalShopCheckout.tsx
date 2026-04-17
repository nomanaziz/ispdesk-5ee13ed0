import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/stores/useCart";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/shopUtils";
import { ArrowLeft, Trash2, Minus, Plus, Truck, User } from "lucide-react";
import { toast } from "sonner";

export default function PortalShopCheckout() {
  const { items, updateQty, removeItem, subtotal, clear } = useCart();
  const { customer } = usePortalAuth();
  const nav = useNavigate();
  const [notes, setNotes] = useState("");
  const [paymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [addressOverride, setAddressOverride] = useState(customer?.address || "");

  const allFree = items.length > 0 && items.every((it) => it.freeShipping);
  const sub = subtotal();
  const shipping = allFree ? 0 : (items.length > 0 ? 80 : 0); // flat default; admin can adjust
  const total = sub + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="mb-4 text-muted-foreground">কার্টে কোনো প্রোডাক্ট নেই</p>
        <Link to="/portal/shop"><Button>শপে যান</Button></Link>
      </div>
    );
  }

  const placeOrder = async () => {
    if (!customer) return toast.error("লগইন প্রয়োজন");
    if (!addressOverride || addressOverride.trim().length < 5) return toast.error("ঠিকানা দিন");
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase
        .from("shop_orders")
        .insert({
          order_no: "",
          customer_name: customer.name || "Customer",
          mobile: customer.mobile || "",
          email: customer.email || null,
          address: addressOverride,
          district: "",
          thana: null,
          inside_dhaka: false,
          subtotal: sub,
          shipping,
          discount: 0,
          total,
          payment_method: paymentMethod,
          payment_status: "pending",
          order_status: "pending",
          notes: notes || null,
          client_id: customer.sub,
        } as any)
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
      nav("/portal/my-orders");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <Link to="/portal/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />শপে ফিরুন
      </Link>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />আপনার তথ্য</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="font-medium">{customer?.name}</div>
              <div className="text-muted-foreground">{customer?.mobile}</div>
              {customer?.email && <div className="text-muted-foreground">{customer.email}</div>}
              <div className="pt-3">
                <Label>ডেলিভারি ঠিকানা *</Label>
                <Textarea value={addressOverride} onChange={(e) => setAddressOverride(e.target.value)} rows={2} />
              </div>
              <div className="pt-2">
                <Label>অর্ডার নোট</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">আইটেম ({items.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((it) => (
                <div key={it.productId} className="flex gap-3 items-start border-b last:border-0 pb-3 last:pb-0">
                  <div className="h-16 w-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    {it.image && <img src={it.image} alt={it.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1">{it.name}</div>
                    <div className="text-primary font-semibold text-sm">{formatBDT(it.price)}</div>
                    {it.freeShipping && (
                      <Badge className="bg-emerald-600 text-[10px] mt-1"><Truck className="h-3 w-3 mr-1" />ফ্রি শিপিং</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded">
                      <button onClick={() => updateQty(it.productId, it.quantity - 1)} className="p-1 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                      <span className="px-2 text-xs">{it.quantity}</span>
                      <button onClick={() => updateQty(it.productId, it.quantity + 1)} className="p-1 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button onClick={() => removeItem(it.productId)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="text-right text-sm font-bold w-20">{formatBDT(it.price * it.quantity)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit sticky top-20">
          <CardHeader><CardTitle className="text-base">অর্ডার সারমর্ম</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>সাবটোটাল</span><span>{formatBDT(sub)}</span></div>
            <div className="flex justify-between">
              <span>শিপিং</span>
              <span>{allFree ? <span className="text-emerald-700 font-medium">ফ্রি</span> : formatBDT(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>মোট</span><span className="text-primary">{formatBDT(total)}</span>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2 mt-2">
              পেমেন্ট: <strong>ক্যাশ অন ডেলিভারি</strong> — ডেলিভারির সময় পেমেন্ট করুন।
            </div>
            <Button onClick={placeOrder} disabled={submitting} className="w-full mt-2">
              {submitting ? "অর্ডার করা হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
