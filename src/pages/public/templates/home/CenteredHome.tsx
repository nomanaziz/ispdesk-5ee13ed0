import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Package, Zap, Shield, Globe, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CenteredHome() {
  const { data: packages } = useQuery({
    queryKey: ["public-packages-centered"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price").limit(4);
      return data || [];
    },
  });

  return (
    <>
      <section className="py-32 bg-gradient-to-br from-violet-50 via-white to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-300 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-block bg-violet-100 text-violet-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">নেক্সট জেন ইন্টারনেট</div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight mb-8">
            ইন্টারনেট, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">পুনঃ-উদ্ভাবিত।</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">আজকের প্রজন্মের জন্য তৈরি — দ্রুত, নির্ভরযোগ্য, স্মার্ট।</p>
          <div className="flex flex-wrap justify-center gap-4">
            <NavLink to="/packages"><Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-10 h-14 text-base">শুরু করুন <ArrowRight className="ml-2 h-5 w-5" /></Button></NavLink>
            <NavLink to="/coverage"><Button size="lg" variant="outline" className="border-violet-600 text-violet-600 px-10 h-14 text-base">কভারেজ চেক</Button></NavLink>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Zap, label: "আল্ট্রা ফাস্ট" },
              { icon: Shield, label: "সিকিউর" },
              { icon: Globe, label: "BDIX" },
              { icon: Headphones, label: "২৪/৭ সাপোর্ট" },
            ].map((f, i) => (
              <div key={i}>
                <f.icon className="h-12 w-12 text-violet-600 mx-auto mb-3" />
                <div className="font-semibold text-slate-900">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-16">আমাদের প্যাকেজ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages?.map((p, i) => (
              <Card key={p.id} className={`bg-white ${i === 1 ? 'ring-2 ring-violet-500 scale-105' : ''}`}>
                <CardContent className="p-6 text-center">
                  <Package className="h-8 w-8 text-violet-600 mx-auto mb-3" />
                  <h3 className="font-bold mb-2">{p.name}</h3>
                  <div className="text-3xl font-extrabold text-violet-600 my-3">৳{Number(p.price || 0).toLocaleString()}</div>
                  <NavLink to="/new-connection"><Button className="w-full bg-violet-600 hover:bg-violet-700" size="sm">নিন</Button></NavLink>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
