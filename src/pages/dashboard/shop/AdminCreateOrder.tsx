import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Search } from "lucide-react";
import { formatBDT, BD_DISTRICTS, isInsideDhaka } from "@/lib/shopUtils";
import { toast } from "sonner";

interface Line {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  warranty_months: number;
  free_shipping: boolean;
}

export default function AdminCreateOrder() {
  const nav = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [orderStatus, setOrderStatus] = useState("processing");
  const [notes, setNotes] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("clients").select("id,name,client_id,contact,email,address").order("name").limit(500),
        supabase.from("shop_products").select("*").eq("status", "active").order("name").limit(500),
      ]);
      setClients((c as any) || []);
      setProducts((p as any) || []);
    })();
  }, []);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.client_id?.toLowerCase().includes(q) ||
        c.contact?.includes(q),
    ).slice(0, 50);
  }, [clients, clientSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [products, productSearch]);

  const pickClient = (c: any) => {
    setSelectedClient(c);
    setAddress(c.address || "");
    const matched = BD_DISTRICTS.find((d) => (c.address || "").toLowerCase().includes(d.toLowerCase()));
    if (matched) setDistrict(matched);
    setClientSearch("");
  };

  const addProduct = (p: any) => {
    if (lines.find((l) => l.product_id === p.id)) {
      toast.info("ইতিমধ্যে যোগ করা হয়েছে");
      return;
    }
    setLines([
      ...lines,
      {
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: 1,
        warranty_months: p.warranty_months || 0,
        free_shipping: !!p.free_shipping,
      },
    ]);
    setProductSearch("");
  };

  const updateLine = (i: number, k: keyof Line, v: any) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const allFree = lines.length > 0 && lines.every((l) => l.free_shipping);
  const effectiveShipping = allFree ? 0 : Number(shipping) || 0;
  const total = subtotal + effectiveShipping - (Number(discount) || 0);

  const save = async () => {
    if (!selectedClient) return toast.error("কাস্টমার সিলেক্ট করুন");
    if (lines.length === 0) return toast.error("প্রোডাক্ট যোগ করুন");
    if (!address || !district) return toast.error("ঠিকানা ও জেলা দিন");

    setSaving(true);
    try {
      const inside = isInsideDhaka(district);
      const { data: order, error } = await supabase
        .from("shop_orders")
        .insert({
          order_no: "",
          customer_name: selectedClient.name,
          mobile: selectedClient.contact || "",
          email: selectedClient.email || null,
          address,
          district,
          thana: thana || null,
          inside_dhaka: inside,
          subtotal,
          shipping: effectiveShipping,
          discount: Number(discount) || 0,
          total,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          order_status: orderStatus,
          notes: notes || null,
          client_id: selectedClient.id,
        } as any)
        .select()
        .single();
      if (error) throw error;

      const items = lines.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        name: l.name,
        price: l.price,
        quantity: l.quantity,
        subtotal: l.price * l.quantity,
        warranty_months: l.warranty_months,
      }));
      const { error: e2 } = await supabase.from("shop_order_items").insert(items);
      if (e2) throw e2;

      toast.success("অর্ডার তৈরি হয়েছে");
      nav(`/dashboard/shop/orders/${order.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/dashboard/shop/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />অর্ডার তালিকায় ফিরুন
      </Link>

      <Card>
        <CardHeader><CardTitle>কাস্টমারের জন্য অর্ডার তৈরি করুন</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Client picker */}
          <div>
            <Label>কাস্টমার *</Label>
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div>
                  <div className="font-medium">{selectedClient.name} <span className="text-xs text-muted-foreground">({selectedClient.client_id})</span></div>
                  <div className="text-sm text-muted-foreground">{selectedClient.contact} {selectedClient.email && `· ${selectedClient.email}`}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedClient(null)}>পরিবর্তন</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="নাম / Client ID / মোবাইল" className="pl-9" />
                </div>
                {clientSearch && (
                  <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button key={c.id} type="button" onClick={() => pickClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.client_id} · {c.contact || "—"}</div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <div className="p-3 text-sm text-muted-foreground">কোনো কাস্টমার পাওয়া যায়নি</div>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Address */}
          {selectedClient && (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>জেলা *</Label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">নির্বাচন করুন</option>
                  {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><Label>থানা/উপজেলা</Label><Input value={thana} onChange={(e) => setThana(e.target.value)} /></div>
              <div className="md:col-span-3"><Label>ঠিকানা *</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} /></div>
            </div>
          )}

          {/* Product picker */}
          <div>
            <Label>প্রোডাক্ট যোগ করুন</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="নাম / SKU দিয়ে খুঁজুন" className="pl-9" />
            </div>
            {productSearch && (
              <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku || "—"} · স্টক: {p.stock}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.free_shipping && <Badge className="bg-emerald-600">ফ্রি শিপিং</Badge>}
                      <span className="font-medium">{formatBDT(p.price)}</span>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          {lines.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">প্রোডাক্ট</th>
                    <th className="text-right p-2 w-24">দাম</th>
                    <th className="text-right p-2 w-20">পরিমাণ</th>
                    <th className="text-right p-2 w-24">মোট</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.product_id} className="border-t">
                      <td className="p-2">
                        {l.name}
                        {l.free_shipping && <Badge className="ml-2 bg-emerald-600 text-[10px]">ফ্রি শিপিং</Badge>}
                      </td>
                      <td className="p-2 text-right">
                        <Input type="number" value={l.price} onChange={(e) => updateLine(i, "price", Number(e.target.value))} className="h-8 text-right" />
                      </td>
                      <td className="p-2 text-right">
                        <Input type="number" min={1} value={l.quantity} onChange={(e) => updateLine(i, "quantity", Math.max(1, Number(e.target.value)))} className="h-8 text-right" />
                      </td>
                      <td className="p-2 text-right font-medium">{formatBDT(l.price * l.quantity)}</td>
                      <td className="p-2 text-center">
                        <Button size="icon" variant="ghost" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals + status */}
          <div className="grid md:grid-cols-2 gap-6 pt-2 border-t">
            <div className="space-y-3">
              <div>
                <Label>পেমেন্ট মেথড</Label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="cod">Cash on Delivery</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>পেমেন্ট স্ট্যাটাস</Label>
                  <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <Label>অর্ডার স্ট্যাটাস</Label>
                  <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div><Label>নোট</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm h-fit">
              <div className="flex justify-between"><span>সাবটোটাল</span><span>{formatBDT(subtotal)}</span></div>
              <div className="flex justify-between items-center">
                <span>শিপিং {allFree && <span className="text-emerald-700 text-xs">(সব আইটেম ফ্রি)</span>}</span>
                <Input type="number" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className="h-8 w-24 text-right" disabled={allFree} />
              </div>
              <div className="flex justify-between items-center">
                <span>ডিসকাউন্ট</span>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="h-8 w-24 text-right" />
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>মোট</span><span className="text-primary">{formatBDT(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Link to="/dashboard/shop/orders"><Button variant="outline">বাতিল</Button></Link>
            <Button onClick={save} disabled={saving}>{saving ? "সংরক্ষণ হচ্ছে..." : "অর্ডার তৈরি করুন"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
