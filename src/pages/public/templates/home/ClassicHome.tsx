import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wifi, Shield, Clock, Headphones, Zap, Globe, ChevronRight, Users, MapPin,
  Package, Server, Monitor, Gamepad2, Star, ArrowRight, Search,
  Phone, Award, Signal, Tv, Play
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogoMarquee } from "@/components/public/LogoMarquee";
import { useState } from "react";
import { Input } from "@/components/ui/input";

function useHeroContent() {
  return useQuery({
    queryKey: ["landing_content", "hero"],
    queryFn: async () => {
      const { data } = await supabase.from("landing_content").select("content_key,content_value").eq("section", "hero").eq("is_active", true);
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { map[r.content_key] = r.content_value; });
      return map;
    },
    staleTime: 30_000,
  });
}

function FestivalBanner() {
  const { data, isLoading } = useHeroContent();
  if (isLoading) return null;
  const m = data?.marquee;
  if (!m || m.enabled === false || !m.text || !String(m.text).trim()) return null;
  const text = String(m.text);
  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 overflow-hidden">
      <div className="flex animate-marquee-fast whitespace-nowrap">
        {[1, 2].map((k) => (
          <span key={k} className="mx-12 text-sm font-medium flex items-center gap-2">{text}</span>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  const { data } = useHeroContent();
  const m = data?.main || {};
  const badge = m.badge || "৯৯.৯% আপটাইম গ্যারান্টি";
  const title1 = m.title_1 || "দ্রুতগতির";
  const titleHighlight = m.title_highlight || "ফাইবার অপটিক";
  const title2 = m.title_2 || "ইন্টারনেট";
  const subtitle = m.subtitle || "সাশ্রয়ী মূল্যে BDIX, FTP ও ক্যাশ সার্ভার সুবিধাসহ উচ্চ গতির ইন্টারনেট সেবা।";
  const priceLabel = m.price_label || "মাত্র";
  const price = m.price || "৳৫০০";
  const priceSuffix = m.price_suffix || "/মাস থেকে শুরু";
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500 rounded-full blur-[150px]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-cyan-500/30">
              <Signal className="h-4 w-4" /> {badge}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              {title1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">{titleHighlight}</span> {title2}
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">{subtitle}</p>
            <div className="inline-flex items-baseline gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl mb-8 shadow-lg shadow-orange-500/30">
              <span className="text-sm">{priceLabel}</span>
              <span className="text-4xl font-extrabold">{price}</span>
              <span className="text-sm">{priceSuffix}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <NavLink to="/packages"><Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-8">প্যাকেজ দেখুন <ChevronRight className="ml-1 h-5 w-5" /></Button></NavLink>
              <NavLink to="/new-connection"><Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8">কানেকশন নিন <ArrowRight className="ml-1 h-5 w-5" /></Button></NavLink>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-2xl">
                  <Wifi className="h-16 w-16 text-white" />
                </div>
              </div>
              <div className="absolute top-4 -right-4 bg-white text-slate-900 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-orange-500" /> ১০০ Mbps</div>
              <div className="absolute bottom-8 -left-8 bg-white text-slate-900 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-green-500" /> সুরক্ষিত</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { icon: Clock, value: "৯৯.৯%", label: "আপটাইম", color: "text-cyan-500" },
    { icon: Users, value: "৫০০০+", label: "সন্তুষ্ট গ্রাহক", color: "text-orange-500" },
    { icon: MapPin, value: "১৫+", label: "কভারেজ এলাকা", color: "text-green-500" },
    { icon: Server, value: "BDIX", label: "ক্যাশ সার্ভার", color: "text-purple-500" },
  ];
  return (
    <section className="relative -mt-8 z-10 pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <Card key={i} className="border-slate-200 shadow-lg bg-white">
              <CardContent className="p-5 text-center">
                <s.icon className={`h-8 w-8 mx-auto mb-2 ${s.color}`} />
                <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Zap, title: "আল্ট্রা ফাস্ট স্পিড", desc: "১০০ Mbps পর্যন্ত ডাউনলোড স্পিড।", color: "bg-orange-50 text-orange-600" },
    { icon: Shield, title: "নিরাপদ সংযোগ", desc: "এন্টারপ্রাইজ গ্রেড ফায়ারওয়াল।", color: "bg-green-50 text-green-600" },
    { icon: Clock, title: "সার্বক্ষণিক সেবা", desc: "৩৬৫ দিন ২৪ ঘণ্টা সাপোর্ট।", color: "bg-cyan-50 text-cyan-600" },
    { icon: Globe, title: "ফাইবার অপটিক", desc: "সরাসরি ফাইবার সংযোগ।", color: "bg-purple-50 text-purple-600" },
    { icon: Server, title: "BDIX ও ক্যাশ", desc: "জনপ্রিয় সাইটে সর্বোচ্চ স্পিড।", color: "bg-blue-50 text-blue-600" },
    { icon: Headphones, title: "দ্রুত সমাধান", desc: "২ ঘণ্টার মধ্যে সমাধান।", color: "bg-red-50 text-red-600" },
  ];
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wider">আমাদের বৈশিষ্ট্য</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">কেন আমাদের বেছে নেবেন?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="border-slate-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all">
              <CardContent className="p-6">
                <div className={`h-14 w-14 rounded-xl ${f.color.split(" ")[0]} flex items-center justify-center mb-4`}>
                  <f.icon className={`h-7 w-7 ${f.color.split(" ")[1]}`} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PackagePreviewSection() {
  const { data: packages } = useQuery({
    queryKey: ["public-packages-home"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price", { ascending: true }).limit(4);
      return data || [];
    },
  });
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wider">প্যাকেজ সমূহ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">জনপ্রিয় প্যাকেজ</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages?.map((pkg, i) => (
            <Card key={pkg.id} className={`border-slate-200 bg-white hover:shadow-xl transition-all ${i === 1 ? 'ring-2 ring-cyan-500' : ''}`}>
              <CardContent className="p-6 text-center">
                <Package className="h-8 w-8 text-cyan-600 mx-auto mb-4" />
                <h3 className="font-bold text-lg text-slate-900 mb-1">{pkg.name}</h3>
                <div className="text-sm text-slate-500 mb-3">↓ {pkg.bandwidth_down} Mbps | ↑ {pkg.bandwidth_up} Mbps</div>
                <div className="text-4xl font-extrabold text-cyan-600 mb-1">৳{Number(pkg.price || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-400 mb-4">মাসিক</div>
                <NavLink to="/new-connection"><Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">কানেকশন নিন</Button></NavLink>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <NavLink to="/packages"><Button variant="outline" size="lg" className="border-cyan-500 text-cyan-600">সব প্যাকেজ দেখুন <ChevronRight className="ml-1 h-5 w-5" /></Button></NavLink>
        </div>
      </div>
    </section>
  );
}

function CoverageCheck() {
  const [query, setQuery] = useState("");
  return (
    <section className="py-16 bg-gradient-to-br from-cyan-600 to-teal-700 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">আপনার এলাকায় সেবা আছে?</h2>
        <p className="text-teal-100 mb-8">এলাকার নাম লিখে কভারেজ চেক করুন</p>
        <div className="flex gap-3 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="এলাকার নাম..." className="pl-10 bg-white text-slate-900 border-0 h-12" />
          </div>
          <NavLink to={`/coverage?q=${query}`}><Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-8">চেক করুন</Button></NavLink>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-cyan-600 to-teal-700 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">সংযুক্ত হতে প্রস্তুত?</h2>
        <p className="text-teal-100 text-lg mb-8">দ্রুতগতির ফাইবার অপটিক ইন্টারনেট সেবা পেতে এখনই কানেকশন নিন।</p>
        <div className="flex flex-wrap justify-center gap-4">
          <NavLink to="/new-connection"><Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10">কানেকশন নিন <ArrowRight className="ml-2 h-5 w-5" /></Button></NavLink>
          <a href="tel:09678123456"><Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 px-10"><Phone className="mr-2 h-5 w-5" /> কল করুন</Button></a>
        </div>
      </div>
    </section>
  );
}

export default function ClassicHome() {
  return (
    <>
      <FestivalBanner />
      <HeroSection />
      <StatsSection />
      <LogoMarquee />
      <FeaturesSection />
      <PackagePreviewSection />
      <CoverageCheck />
      <CTASection />
    </>
  );
}
