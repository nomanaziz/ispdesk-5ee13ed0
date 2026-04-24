import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Package, Wifi, Server, MapPin, Phone, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function LeftRailHome() {
  const { data: packages } = useQuery({
    queryKey: ["public-packages-leftrail"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price").limit(6);
      return data || [];
    },
  });

  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left rail */}
          <aside className="lg:col-span-3 space-y-6">
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-6 rounded-r-lg">
              <Wifi className="h-10 w-10 text-emerald-600 mb-3" />
              <h3 className="font-bold text-slate-900 mb-2">ফাইবার নেটওয়ার্ক</h3>
              <p className="text-sm text-slate-600">FTTH প্রযুক্তি — সরাসরি ফাইবার সংযোগ।</p>
            </div>
            <div className="bg-slate-50 border-l-4 border-slate-400 p-6 rounded-r-lg">
              <h4 className="font-semibold text-slate-900 mb-3">যোগাযোগ</h4>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" /> ০৯৬৭৮-১২৩৪৫৬</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-600" /> info@example.com</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> ঢাকা, বাংলাদেশ</div>
              </div>
            </div>
            <div className="bg-emerald-600 text-white p-6 rounded-lg">
              <h4 className="font-semibold mb-2">এখনই কানেকশন নিন</h4>
              <p className="text-sm text-emerald-100 mb-4">প্রথম মাসে ৫০% ছাড়।</p>
              <NavLink to="/new-connection"><Button className="w-full bg-white text-emerald-700 hover:bg-emerald-50">আবেদন</Button></NavLink>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-9 space-y-10">
            <div className="border-l-4 border-emerald-600 pl-6">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">আমরা কি করি</div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">দ্রুতগতির ইন্টারনেট, প্রতিদিনের জন্য।</h1>
              <p className="text-lg text-slate-600 mb-6">ব্যবসা, পরিবার ও গেমারদের জন্য নির্ভরযোগ্য ফাইবার ইন্টারনেট সেবা।</p>
              <div className="flex gap-3">
                <NavLink to="/packages"><Button className="bg-emerald-600 hover:bg-emerald-700">প্যাকেজ <ArrowRight className="ml-2 h-4 w-4" /></Button></NavLink>
                <NavLink to="/coverage"><Button variant="outline" className="border-emerald-600 text-emerald-700">কভারেজ</Button></NavLink>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2"><Server className="h-6 w-6 text-emerald-600" /> জনপ্রিয় প্যাকেজ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages?.map((p) => (
                  <Card key={p.id} className="border-l-4 border-emerald-500 rounded-none">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Package className="h-7 w-7 text-emerald-600 mt-1" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{p.name}</h3>
                          <div className="text-xs text-slate-500 mb-2">↓ {p.bandwidth_down} Mbps</div>
                          <div className="text-2xl font-extrabold text-emerald-600">৳{Number(p.price || 0).toLocaleString()}</div>
                          <NavLink to="/new-connection" className="text-xs text-emerald-700 font-semibold hover:underline mt-2 inline-block">কানেকশন নিন →</NavLink>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
