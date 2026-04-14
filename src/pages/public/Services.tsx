import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Building2, Globe, Server, Shield, Headphones, Check, ArrowRight, Clock, Zap } from "lucide-react";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fallbackServices = [
  { icon: Wifi, title: "ব্রডব্যান্ড ইন্টারনেট", desc: "হোম ইউজারদের জন্য সাশ্রয়ী মূল্যে উচ্চ গতির ইন্টারনেট।", tags: ["HD স্ট্রিমিং", "গেমিং", "ওয়ার্ক ফ্রম হোম"] },
  { icon: Globe, title: "ফাইবার অপটিক (FTTH)", desc: "সর্বোচ্চ গতি ও স্থিতিশীলতা সহ ফাইবার টু দ্য হোম।", tags: ["লো ল্যাটেন্সি", "সিমেট্রিক", "BDIX"] },
  { icon: Building2, title: "কর্পোরেট সংযোগ", desc: "ডেডিকেটেড ব্যান্ডউইথ, স্ট্যাটিক আইপি এবং SLA সহ।", tags: ["ডেডিকেটেড", "SLA", "স্ট্যাটিক IP"] },
  { icon: Server, title: "হোস্টিং ও সার্ভার", desc: "ওয়েব হোস্টিং, VPS এবং ডেডিকেটেড সার্ভার সলিউশন।", tags: ["VPS", "cPanel", "SSL"] },
  { icon: Shield, title: "নেটওয়ার্ক সিকিউরিটি", desc: "ফায়ারওয়াল, DDoS প্রটেকশন এবং নেটওয়ার্ক মনিটরিং।", tags: ["ফায়ারওয়াল", "DDoS", "মনিটরিং"] },
  { icon: Headphones, title: "টেকনিক্যাল সাপোর্ট", desc: "২৪/৭ কাস্টমার কেয়ার এবং অন-সাইট সাপোর্ট।", tags: ["২৪/৭", "অন-সাইট", "রিমোট"] },
];

export default function Services() {
  const { data: dbServices } = useQuery({
    queryKey: ["public-services"],
    queryFn: async () => {
      const { data } = await supabase.from("website_services").select("*").eq("status", "active").order("sort_order");
      return data || [];
    },
  });

  const iconMap: Record<string, any> = { Wifi, Building2, Globe, Server, Shield, Headphones };

  return (
    <>
      <BreadcrumbBanner
        title="আমাদের সেবা সমূহ"
        subtitle="সকল প্রকার ইন্টারনেট ও নেটওয়ার্কিং সলিউশন"
        breadcrumbs={[{ label: "সেবা সমূহ" }]}
      />

      {/* Highlight badges */}
      <div className="bg-white border-b border-slate-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-4">
          {[
            { icon: Clock, label: "৯৯.৯% আপটাইম" },
            { icon: Server, label: "BDIX Speed" },
            { icon: Zap, label: "১০০ Mbps পর্যন্ত" },
            { icon: Shield, label: "সুরক্ষিত নেটওয়ার্ক" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-sm text-slate-600 bg-cyan-50 px-4 py-2 rounded-full">
              <b.icon className="h-4 w-4 text-cyan-600" />
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(dbServices?.length ? dbServices : fallbackServices).map((s: any, i: number) => {
              const Icon = iconMap[s.icon_name] || fallbackServices[i % fallbackServices.length]?.icon || Wifi;
              const tags = s.tags || fallbackServices[i % fallbackServices.length]?.tags || [];
              return (
                <Card key={s.id || i} className="border-slate-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="h-7 w-7 text-cyan-600" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">{s.title || s.name}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">{s.desc || s.description}</p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full border border-cyan-100 font-medium">{tag}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-16 bg-gradient-to-r from-cyan-600 to-teal-700 rounded-2xl p-10 text-center text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">আপনার জন্য সেরা সমাধান খুঁজুন</h3>
            <p className="text-teal-100 mb-6 max-w-xl mx-auto">আমাদের বিশেষজ্ঞ দলের সাথে কথা বলুন এবং আপনার প্রয়োজন অনুযায়ী কাস্টমাইজড সমাধান পান।</p>
            <div className="flex flex-wrap justify-center gap-3">
              <NavLink to="/new-connection">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg">
                  কানেকশন নিন <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </NavLink>
              <NavLink to="/contact">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold">
                  যোগাযোগ করুন
                </Button>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
