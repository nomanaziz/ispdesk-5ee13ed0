import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Check, Phone, Server, Users, Building2 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Tab = "home" | "corporate" | "dedicated";

export default function GalaxyStylePackages() {
  const [tab, setTab] = useState<Tab>("home");

  const { data: ispPackages, isLoading: loadingIsp } = useQuery({
    queryKey: ["public-packages-galaxy"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price", { ascending: true });
      return data || [];
    },
  });

  const { data: dedicated, isLoading: loadingDed } = useQuery({
    queryKey: ["public-dedicated-packages"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("website_dedicated_packages").select("*").eq("status", "active").order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const homePkgs = (ispPackages || []).filter((p: any) => (p.price || 0) <= 1500);
  const corpPkgs = (ispPackages || []).filter((p: any) => (p.price || 0) > 1500);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "home", label: "হোম প্ল্যান", icon: Users },
    { key: "corporate", label: "কর্পোরেট প্ল্যান", icon: Building2 },
    { key: "dedicated", label: "ডেডিকেটেড", icon: Server },
  ];

  return (
    <>
      {/* Wave gradient banner */}
      <section className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-300 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-400 rounded-full blur-[150px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">ইন্টারনেট প্যাকেজসমূহ</h1>
          <p className="text-orange-100 text-lg max-w-2xl mx-auto">আপনার প্রয়োজন অনুযায়ী সেরা প্ল্যান বেছে নিন — হোম থেকে এন্টারপ্রাইজ পর্যন্ত।</p>
        </div>
        {/* Wave bottom */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 100" preserveAspectRatio="none" style={{ height: 60 }}>
          <path d="M0,50 C360,100 1080,0 1440,50 L1440,100 L0,100 Z" fill="white" />
        </svg>
      </section>

      <div className="bg-white pt-8 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pill tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold transition-all",
                  tab === t.key
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Home / Corporate cards */}
          {tab !== "dedicated" && (
            loadingIsp ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(tab === "home" ? homePkgs : corpPkgs).map((p: any, i: number) => (
                  <Card key={p.id} className={cn("border-2 transition-all hover:shadow-2xl relative overflow-hidden", i === 1 ? "border-orange-500" : "border-slate-200")}>
                    {i === 1 && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-4 py-1 rounded-bl-lg uppercase tracking-wider">জনপ্রিয়</div>
                    )}
                    <CardContent className="p-6 text-center">
                      <Package className={cn("h-10 w-10 mx-auto mb-4", i === 1 ? "text-orange-500" : "text-slate-600")} />
                      <h3 className="font-bold text-xl text-slate-900 mb-1">{p.name}</h3>
                      <div className="bg-slate-50 rounded-lg p-3 my-4">
                        <div className="text-sm text-slate-500">↓ {p.bandwidth_down} Mbps | ↑ {p.bandwidth_up} Mbps</div>
                      </div>
                      <div className={cn("text-4xl font-extrabold mb-1", i === 1 ? "text-orange-600" : "text-slate-900")}>
                        ৳{Number(p.price || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mb-4">/মাস</div>
                      <ul className="text-left text-sm text-slate-600 space-y-2 mb-5">
                        {["BDIX Speed", "FTP Access", "২৪/৭ সাপোর্ট"].map((f) => (
                          <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {f}</li>
                        ))}
                      </ul>
                      <NavLink to="/new-connection">
                        <Button className={cn("w-full font-bold", i === 1 ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white")}>
                          কানেকশন নিন
                        </Button>
                      </NavLink>
                    </CardContent>
                  </Card>
                ))}
                {(tab === "home" ? homePkgs : corpPkgs).length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">এই ক্যাটেগরিতে কোনো প্যাকেজ নেই।</div>
                )}
              </div>
            )
          )}

          {/* Dedicated cards */}
          {tab === "dedicated" && (
            loadingDed ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dedicated?.map((d: any) => (
                  <Card key={d.id} className={cn("border-2 transition-all hover:shadow-2xl relative overflow-hidden", d.is_popular ? "border-orange-500" : "border-slate-200")}>
                    {d.is_popular && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-4 py-1 rounded-bl-lg uppercase tracking-wider">জনপ্রিয়</div>
                    )}
                    <CardContent className="p-7 text-center">
                      <Server className={cn("h-12 w-12 mx-auto mb-4", d.is_popular ? "text-orange-500" : "text-slate-600")} />
                      <h3 className="font-bold text-2xl text-slate-900 mb-2">{d.name}</h3>
                      {d.bandwidth_label && <div className="text-sm text-slate-500 mb-4">{d.bandwidth_label}</div>}
                      <div className={cn("text-3xl font-extrabold my-4", d.is_popular ? "text-orange-600" : "text-slate-900")}>
                        {d.price_label}
                      </div>
                      {Array.isArray(d.badges) && d.badges.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                          {d.badges.map((b: string) => (
                            <span key={b} className="text-[10px] font-semibold bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-full border border-orange-100">{b}</span>
                          ))}
                        </div>
                      )}
                      {Array.isArray(d.features) && d.features.length > 0 && (
                        <ul className="text-left text-sm text-slate-600 space-y-2 mb-6">
                          {d.features.map((f: string) => (
                            <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 flex-shrink-0" /> {f}</li>
                          ))}
                        </ul>
                      )}
                      <a href={d.contact_url || "/contact"}>
                        <Button className={cn("w-full font-bold", d.is_popular ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white")}>
                          <Phone className="mr-2 h-4 w-4" /> যোগাযোগ করুন
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                ))}
                {(!dedicated || dedicated.length === 0) && (
                  <div className="col-span-full text-center py-12 text-slate-400">কোনো ডেডিকেটেড প্যাকেজ নেই।</div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
