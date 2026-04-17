import { Link } from "react-router-dom";
import { useCart } from "@/stores/useCart";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/shopUtils";
import { Trash2, Minus, Plus, ShoppingBag, Truck } from "lucide-react";

export default function Cart() {
  const { items, updateQty, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 mx-auto text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">আপনার কার্ট খালি</h1>
        <p className="text-slate-500 mb-6">প্রোডাক্ট দেখতে শপে যান</p>
        <Link to="/shop"><Button className="bg-orange-500 hover:bg-orange-600">শপে যান</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">শপিং কার্ট</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => (
            <div key={it.productId} className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200">
              <div className="h-20 w-20 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0">
                {it.image && <img src={it.image} alt={it.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/shop/${it.slug}`} className="font-semibold text-slate-900 hover:text-cyan-700 line-clamp-2 block">{it.name}</Link>
                <p className="text-cyan-700 font-bold mt-1">{formatBDT(it.price)}</p>
                {it.freeShipping && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-700 font-medium">
                    <Truck className="h-3 w-3" />ফ্রি শিপিং
                  </span>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border rounded">
                    <button onClick={() => updateQty(it.productId, it.quantity - 1)} className="p-1.5 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="px-3 text-sm font-medium">{it.quantity}</span>
                    <button onClick={() => updateQty(it.productId, it.quantity + 1)} className="p-1.5 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => removeItem(it.productId)} className="text-red-600 hover:text-red-700 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{formatBDT(it.price * it.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit sticky top-24">
          <h2 className="font-semibold text-slate-900 mb-4">অর্ডার সারমর্ম</h2>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">সাবটোটাল</span>
            <span className="font-medium">{formatBDT(subtotal())}</span>
          </div>
          <div className="flex justify-between text-sm mb-3 pb-3 border-b">
            <span className="text-slate-600">শিপিং</span>
            <span className="text-xs text-slate-500">চেকআউটে গণনা হবে</span>
          </div>
          <div className="flex justify-between font-bold text-lg mb-4">
            <span>মোট</span>
            <span className="text-cyan-700">{formatBDT(subtotal())}</span>
          </div>
          <Link to="/checkout"><Button className="w-full bg-orange-500 hover:bg-orange-600">চেকআউট করুন</Button></Link>
        </div>
      </div>
    </div>
  );
}
