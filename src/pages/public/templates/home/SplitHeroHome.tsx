import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wifi, Zap, Shield, Globe, ArrowRight, Package, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function SplitHeroHome() {
  const { data: packages } = useQuery({
    queryKey: ["public-packages-split-home"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price").limit(3);
      return data || [];
    },
  });

  return (
    <>
      {/* Split Hero - image left, content right */}
      <section className="bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-10 left-10 w-72 h-72 bg-white/30 rounded-full blur-[120px]" />
              <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-400/40 rounded-full blur-[120px]" />
            </div>
            <div className="relative">
              <div className="w-72 h-72 rounded-full bg-white/10 border-4 border-white/30 flex items-center justify-center backdrop-blur-sm">
                <Wifi className="h-32 w-32 text-white" />
              </div>
            </div>
          </div>
          <div className="flex items-center p-12 lg:p-20 bg-slate-50">
            <div>
              <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">দ্রুততম ইন্টারনেট</div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                সংযুক্ত থাকুন <br /><span className="text-blue-600">বিশ্বের সাথে</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">ফাইবার অপটিক প্রযুক্তির সর্বাধুনিক ইন্টারনেট সংযোগ — অসীম সম্ভাবনার দরজা খুলে দিন।</p>
              <div className="flex flex-wrap gap-3 mb-10">
                <NavLink to="/packages"><Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">প্যাকেজ <ArrowRight className="ml-2 h-5 w-5" /></Button></NavLink>
                <NavLink to="/new-connection"><Button size="lg" variant="outline" className="border-blue-600 text-blue-600 px-8">কানেকশন নিন</Button></NavLink>
              </div>
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200">
                <div><div className="text-3xl font-bold text-slate-900">৯৯%</div><div className="text-xs text-slate-500">আপটাইম</div></div>
                <div><div className="text-3xl font-bold text-slate-900">২৪/৭</div><div className="text-xs text-slate-500">সাপোর্ট</div></div>
                <div><div className="text-3xl font-bold text-slate-900">৫K+</div><div className="text-xs text-slate-500">গ্রাহক</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - horizontal cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "অতি দ্রুত স্পিড", desc: "১ Gbps পর্যন্ত স্পিড।", color: "text-orange-500" },
              { icon: Shield, title: "নিরাপদ", desc: "এন্ক্রিপ্টেড সংযোগ।", color: "text-green-500" },
              { icon: Globe, title: "BDIX অ্যাক্সেস", desc: "লোকাল কন্টেন্ট দ্রুত।", color: "text-blue-500" },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
                  <f.icon className={`h-8 w-8 ${f.color}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-12">প্যাকেজ সমূহ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages?.map((p) => (
              <Card key={p.id} className="bg-white">
                <CardContent className="p-8 text-center">
                  <Package className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-bold text-xl mb-2">{p.name}</h3>
                  <div className="text-3xl font-extrabold text-blue-600 my-3">৳{Number(p.price || 0).toLocaleString()}</div>
                  <div className="text-sm text-slate-500 mb-6">↓ {p.bandwidth_down} Mbps</div>
                  <NavLink to="/new-connection"><Button className="w-full bg-blue-600 hover:bg-blue-700">নিন <ChevronRight className="ml-1 h-4 w-4" /></Button></NavLink>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
