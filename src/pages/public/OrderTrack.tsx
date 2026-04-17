import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatBDT } from "@/lib/shopUtils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShieldCheck, Package, Truck, CheckCircle2, Clock, XCircle } from "lucide-react";

const statusInfo: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "অপেক্ষমাণ", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "নিশ্চিত", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
  shipped: { label: "শিপ করা হয়েছে", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "ডেলিভারি সম্পন্ন", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "বাতিল", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default function OrderTrack() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [claimItem, setClaimItem] = useState<any>(null);
  const [issue, setIssue] = useState("");

  const load = async () => {
    const [{ data: o }, { data: i }] = await Promise.all([
      supabase.from("shop_orders").select("*").eq("id", id!).maybeSingle(),
      supabase.from("shop_order_items").select("*").eq("order_id", id!),
    ]);
    setOrder(o); setItems((i as any) || []);
  };
  useEffect(() => { load(); }, [id]);

  if (!order) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">লোড হচ্ছে...</div>;

  const si = statusInfo[order.order_status] || statusInfo.pending;
  const SIcon = si.icon;

  const submitClaim = async () => {
    if (!issue.trim()) { toast.error("সমস্যা লিখুন"); return; }
    const { error } = await supabase.from("warranty_claims").insert({
      claim_no: "", order_item_id: claimItem.id, customer_name: order.customer_name,
      mobile: order.mobile, issue, status: "received",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("ওয়ারেন্টি ক্লেইম সাবমিট হয়েছে");
    setClaimItem(null); setIssue("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">অর্ডার #{order.order_no}</h1>
            <p className="text-sm text-slate-500 mt-1">{new Date(order.created_at).toLocaleString("bn-BD")}</p>
          </div>
          <Badge className={si.color}><SIcon className="h-3.5 w-3.5 mr-1" />{si.label}</Badge>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">নাম:</span> <span className="font-medium">{order.customer_name}</span></div>
          <div><span className="text-slate-500">মোবাইল:</span> <span className="font-medium">{order.mobile}</span></div>
          <div className="sm:col-span-2"><span className="text-slate-500">ঠিকানা:</span> <span className="font-medium">{order.address}, {order.thana ? order.thana + ", " : ""}{order.district}</span></div>
          <div><span className="text-slate-500">পেমেন্ট:</span> <span className="font-medium uppercase">{order.payment_method}</span> · <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>{order.payment_status}</Badge></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <h2 className="font-semibold text-slate-900 mb-4">অর্ডার আইটেম</h2>
        <div className="space-y-3">
          {items.map((it) => {
            const expired = it.warranty_end && new Date(it.warranty_end) < new Date();
            const active = it.warranty_start && !expired;
            return (
              <div key={it.id} className="flex flex-wrap gap-3 p-3 border rounded-lg">
                <Package className="h-10 w-10 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{it.name}</p>
                  <p className="text-sm text-slate-600">{it.quantity} × {formatBDT(it.price)} = {formatBDT(it.subtotal)}</p>
                  {it.warranty_months > 0 && (
                    <div className="mt-1 text-xs">
                      {it.warranty_start ? (
                        <span className={active ? "text-green-700" : "text-red-700"}>
                          <ShieldCheck className="h-3 w-3 inline mr-1" />
                          ওয়ারেন্টি {active ? "সক্রিয়" : "মেয়াদোত্তীর্ণ"} · {it.warranty_start} → {it.warranty_end}
                        </span>
                      ) : (
                        <span className="text-slate-500">পেমেন্ট নিশ্চিত হলে ওয়ারেন্টি শুরু হবে ({it.warranty_months} মাস)</span>
                      )}
                    </div>
                  )}
                </div>
                {active && (
                  <Dialog open={claimItem?.id === it.id} onOpenChange={(o) => !o && setClaimItem(null)}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setClaimItem(it)}>ওয়ারেন্টি ক্লেইম</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>ওয়ারেন্টি ক্লেইম</DialogTitle></DialogHeader>
                      <p className="text-sm text-slate-600">{it.name}</p>
                      <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="সমস্যা বিস্তারিত লিখুন..." rows={4} />
                      <Button onClick={submitClaim} className="bg-orange-500 hover:bg-orange-600">সাবমিট করুন</Button>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t space-y-1 text-sm">
          <div className="flex justify-between"><span>সাবটোটাল</span><span>{formatBDT(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>শিপিং</span><span>{formatBDT(order.shipping)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>মোট</span><span className="text-cyan-700">{formatBDT(order.total)}</span></div>
        </div>
      </div>
    </div>
  );
}
