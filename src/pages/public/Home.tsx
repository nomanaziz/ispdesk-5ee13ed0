import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wifi, Shield, Clock, Headphones, Zap, Globe, ChevronRight, Users, MapPin,
  Package, Server, Monitor, Gamepad2, Star, Check, ArrowRight, Search,
  Phone, Award, Signal, Tv, Play
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogoMarquee } from "@/components/public/LogoMarquee";
import { useState } from "react";
import { Input } from "@/components/ui/input";

/* ─── shared content hook ─── */
function useHeroContent() {
  return useQuery({
    queryKey: ["landing_content", "hero"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_content")
        .select("content_key,content_value")
        .eq("section", "hero")
        .eq("is_active", true);
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { map[r.content_key] = r.content_value; });
      return map;
    },
    staleTime: 30_000,
  });
}

/* ─── 1. Festival Marquee ─── */
function FestivalBanner() {
  const { data } = useHeroContent();
  const text = data?.marquee?.text || "🎉 ঈদ মোবারক! সকল প্যাকেজে বিশেষ ছাড় চলছে — নতুন কানেকশনে ৫০% ইনস্টলেশন ফি মওকুফ!  |  🌟 ফাইবার অপটিক কানেকশনে ফ্রি রাউটার!  |  📞 হেল্পলাইন: ০৯৬৭৮-১২৩৪৫৬";
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

/* ─── 2. Hero Section ─── */
function HeroSection() {
  const { data } = useHeroContent();
  const m = data?.main || {};
  const badge = m.badge || "৯৯.৯% আপটাইম গ্যারান্টি";
  const title1 = m.title_1 || "দ্রুতগতির";
  const titleHighlight = m.title_highlight || "ফাইবার অপটিক";
  const title2 = m.title_2 || "ইন্টারনেট";
  const subtitle = m.subtitle || "সাশ্রয়ী মূল্যে BDIX, FTP ও ক্যাশ সার্ভার সুবিধাসহ উচ্চ গতির ইন্টারনেট সেবা। বাফারিং ছাড়া YouTube, Facebook, Netflix উপভোগ করুন।";
  const priceLabel = m.price_label || "মাত্র";
  const price = m.price || "৳৫০০";
  const priceSuffix = m.price_suffix || "/মাস থেকে শুরু";
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500 rounded-full blur-[150px]" />
      </div>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6 border border-cyan-500/30">
              <Signal className="h-4 w-4" /> ৯৯.৯% আপটাইম গ্যারান্টি
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              দ্রুতগতির <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">ফাইবার অপটিক</span> ইন্টারনেট
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">
              সাশ্রয়ী মূল্যে BDIX, FTP ও ক্যাশ সার্ভার সুবিধাসহ উচ্চ গতির ইন্টারনেট সেবা। বাফারিং ছাড়া YouTube, Facebook, Netflix উপভোগ করুন।
            </p>

            {/* Price badge */}
            <div className="inline-flex items-baseline gap-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl mb-8 shadow-lg shadow-orange-500/30">
              <span className="text-sm">মাত্র</span>
              <span className="text-4xl font-extrabold">৳৫০০</span>
              <span className="text-sm">/মাস থেকে শুরু</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <NavLink to="/packages">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-base px-8 shadow-lg shadow-cyan-500/30">
                  প্যাকেজ দেখুন <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
              </NavLink>
              <NavLink to="/new-connection">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base px-8 shadow-lg shadow-orange-500/30">
                  কানেকশন নিন <ArrowRight className="ml-1 h-5 w-5" />
                </Button>
              </NavLink>
              <NavLink to="/quick-pay">
                <Button size="lg" variant="outline" className="border-slate-500 text-slate-300 hover:bg-white/10 font-medium text-base px-8">
                  বিল পরিশোধ
                </Button>
              </NavLink>
            </div>
          </div>

          {/* Right side visual */}
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center">
                <div className="w-56 h-56 rounded-full bg-gradient-to-br from-cyan-500/30 to-teal-500/30 border border-cyan-400/30 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-cyan-500/40">
                    <Wifi className="h-16 w-16 text-white" />
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute top-4 -right-4 bg-white text-slate-900 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" /> ১০০ Mbps
              </div>
              <div className="absolute bottom-8 -left-8 bg-white text-slate-900 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" /> সুরক্ষিত
              </div>
              <div className="absolute top-1/2 -right-12 bg-white text-slate-900 px-3 py-2 rounded-lg shadow-xl text-sm font-semibold flex items-center gap-2">
                <Tv className="h-4 w-4 text-red-500" /> BDIX
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 3. Stats Bar ─── */
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
          {stats.map((stat, i) => (
            <Card key={i} className="border-slate-200 shadow-lg bg-white hover:shadow-xl transition-shadow">
              <CardContent className="p-5 text-center">
                <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl font-extrabold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 5. Fiber Optic Banner ─── */
function FiberBanner() {
  return (
    <section className="relative bg-gradient-to-r from-cyan-700 to-teal-800 text-white py-16 overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.1) 50%, transparent 50%)',
        backgroundSize: '20px 20px'
      }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">ফাইবার অপটিক প্রযুক্তি</h2>
          <p className="text-teal-100 text-lg leading-relaxed mb-6">
            সরাসরি ফাইবার টু দ্য হোম (FTTH) সংযোগ দিয়ে পান সর্বোচ্চ গতি ও স্থিতিশীলতা। আমাদের সম্পূর্ণ নেটওয়ার্ক ফাইবার অপটিক ক্যাবলে পরিচালিত।
          </p>
          <div className="flex flex-wrap gap-3">
            {["জিরো বাফারিং", "লো ল্যাটেন্সি", "সিমেট্রিক স্পিড", "২৪/৭ মনিটরিং"].map((tag) => (
              <span key={tag} className="bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm border border-white/20">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400/30 to-teal-400/30 border-2 border-cyan-400/30 flex items-center justify-center">
            <Globe className="h-20 w-20 text-cyan-300" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 6. Features Grid ─── */
function FeaturesSection() {
  const features = [
    { icon: Zap, title: "আল্ট্রা ফাস্ট স্পিড", desc: "১০০ Mbps পর্যন্ত ডাউনলোড স্পিড সহ বাফারিং-মুক্ত অভিজ্ঞতা।", color: "bg-orange-50 text-orange-600" },
    { icon: Shield, title: "নিরাপদ সংযোগ", desc: "এন্টারপ্রাইজ গ্রেড ফায়ারওয়াল ও DDoS প্রটেকশন।", color: "bg-green-50 text-green-600" },
    { icon: Clock, title: "সার্বক্ষণিক সেবা", desc: "৩৬৫ দিন ২৪ ঘণ্টা টেকনিক্যাল সাপোর্ট।", color: "bg-cyan-50 text-cyan-600" },
    { icon: Globe, title: "ফাইবার অপটিক (FTTH)", desc: "সরাসরি ফাইবার সংযোগ দ্বারা সর্বোচ্চ স্থিতিশীলতা।", color: "bg-purple-50 text-purple-600" },
    { icon: Server, title: "BDIX ও ক্যাশ সার্ভার", desc: "Google, Facebook, YouTube সহ সব জনপ্রিয় সাইটে সর্বোচ্চ স্পিড।", color: "bg-blue-50 text-blue-600" },
    { icon: Headphones, title: "দ্রুত সমাধান", desc: "সমস্যার রিপোর্ট করার ২ ঘণ্টার মধ্যে সমাধান।", color: "bg-red-50 text-red-600" },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wider">আমাদের বৈশিষ্ট্য</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-3">কেন আমাদের বেছে নেবেন?</h2>
          <p className="text-slate-500 max-w-xl mx-auto">সর্বোচ্চ মানের ইন্টারনেট সেবা নিশ্চিত করতে আমরা প্রতিশ্রুতিবদ্ধ</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="border-slate-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className={`h-14 w-14 rounded-xl ${f.color.split(" ")[0]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`h-7 w-7 ${f.color.split(" ")[1]}`} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 7. Gaming/Streaming Banner ─── */
function GamingBanner() {
  return (
    <section className="relative bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white py-16 overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-purple-500 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500 rounded-full blur-[100px]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-purple-500/30">
            <Gamepad2 className="h-4 w-4" /> গেমিং ও স্ট্রিমিং
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">ল্যাগ ছাড়া গেমিং ও স্ট্রিমিং</h2>
          <p className="text-slate-300 text-lg mb-6">
            লো পিং, হাই স্পিড — PUBG, Free Fire, Valorant খেলুন লাগ ছাড়া। 4K Netflix ও YouTube দেখুন বাফারিং ছাড়া।
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            {["< 5ms Ping", "4K Streaming", "Zero Lag", "BDIX Speed"].map((tag) => (
              <span key={tag} className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm border border-white/20">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-xl">
            <Play className="h-10 w-10 text-white" />
          </div>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-xl">
            <Gamepad2 className="h-10 w-10 text-white" />
          </div>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-xl">
            <Monitor className="h-10 w-10 text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 9. Popular Packages ─── */
function PackagePreviewSection() {
  const { data: packages } = useQuery({
    queryKey: ["public-packages-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("isp_packages")
        .select("*")
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(4);
      return data || [];
    },
  });

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wider">প্যাকেজ সমূহ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-3">জনপ্রিয় প্যাকেজ</h2>
          <p className="text-slate-500">আপনার প্রয়োজন অনুযায়ী সেরা প্যাকেজটি বেছে নিন</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages?.map((pkg, i) => (
            <Card key={pkg.id} className={`border-slate-200 bg-white hover:shadow-xl transition-all duration-300 relative overflow-hidden ${i === 1 ? 'ring-2 ring-cyan-500 shadow-lg' : ''}`}>
              {i === 1 && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                  জনপ্রিয়
                </div>
              )}
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center mx-auto mb-4">
                  <Package className={`h-8 w-8 ${i === 1 ? 'text-cyan-600' : 'text-slate-600'}`} />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1">{pkg.name}</h3>
                {pkg.code && <div className="text-xs text-slate-400 mb-2">{pkg.code}</div>}
                <div className="text-sm text-slate-500 mb-3">
                  ↓ {pkg.bandwidth_down} Mbps &nbsp;|&nbsp; ↑ {pkg.bandwidth_up} Mbps
                </div>
                <div className="text-4xl font-extrabold text-cyan-600 mb-1">
                  ৳{pkg.price}
                </div>
                <div className="text-xs text-slate-400 mb-4">মাসিক</div>

                {/* Feature badges */}
                <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                  {["BDIX", "FTP", "Cache"].map((badge) => (
                    <span key={badge} className="text-[10px] font-semibold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-100">{badge}</span>
                  ))}
                </div>

                <NavLink to="/new-connection">
                  <Button className={`w-full font-semibold ${i === 1 ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`} size="sm">
                    কানেকশন নিন
                  </Button>
                </NavLink>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-10">
          <NavLink to="/packages">
            <Button variant="outline" size="lg" className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 font-semibold">
              সব প্যাকেজ দেখুন <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </NavLink>
        </div>
      </div>
    </section>
  );
}

/* ─── 11. Coverage Check ─── */
function CoverageCheck() {
  const [query, setQuery] = useState("");
  return (
    <section className="py-16 bg-gradient-to-br from-cyan-600 to-teal-700 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">আপনার এলাকায় সেবা আছে?</h2>
        <p className="text-teal-100 mb-8">আপনার এলাকার নাম লিখে কভারেজ চেক করুন</p>
        <div className="flex gap-3 max-w-md mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="এলাকার নাম লিখুন..."
              className="pl-10 bg-white text-slate-900 border-0 h-12 text-base"
            />
          </div>
          <NavLink to={`/coverage?q=${query}`}>
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 px-8">
              চেক করুন
            </Button>
          </NavLink>
        </div>
      </div>
    </section>
  );
}

/* ─── 12. How to Connect ─── */
function HowToConnectSection() {
  const steps = [
    { step: "১", title: "প্যাকেজ নির্বাচন", desc: "আপনার পছন্দের স্পিড ও বাজেট অনুযায়ী প্যাকেজ বেছে নিন।", color: "bg-cyan-500" },
    { step: "২", title: "আবেদন করুন", desc: "অনলাইনে বা ফোনে কানেকশনের জন্য আবেদন জমা দিন।", color: "bg-orange-500" },
    { step: "৩", title: "ইনস্টলেশন", desc: "আমাদের দক্ষ টিম আপনার বাসায় এসে সংযোগ স্থাপন করবে।", color: "bg-green-500" },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wider">সহজ প্রক্রিয়া</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-3">কিভাবে সংযোগ নেবেন?</h2>
          <p className="text-slate-500">মাত্র ৩টি সহজ ধাপে ইন্টারনেট সংযোগ পান</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="text-center relative">
              <div className={`h-20 w-20 rounded-2xl ${s.color} flex items-center justify-center text-3xl font-bold text-white mx-auto mb-5 shadow-lg`}>
                {s.step}
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-2">{s.title}</h3>
              <p className="text-slate-500">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute top-10 -right-4 h-6 w-6 text-slate-300" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 13. Testimonials ─── */
function TestimonialsSection() {
  const { data: testimonials } = useQuery({
    queryKey: ["public-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_testimonials")
        .select("*")
        .eq("status", "active")
        .order("sort_order")
        .limit(4);
      return data || [];
    },
  });

  if (!testimonials?.length) return null;

  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-cyan-600 font-semibold text-sm uppercase tracking-wider">গ্রাহকদের মতামত</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2 mb-3">তারা কি বলছেন?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t) => (
            <Card key={t.id} className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating || 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed italic">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    {t.designation && <p className="text-xs text-slate-400">{t.designation}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 15. Partners ─── */
function PartnersSection() {
  const { data: partners } = useQuery({
    queryKey: ["public-partners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_partners")
        .select("*")
        .eq("status", "active")
        .order("sort_order");
      return data || [];
    },
  });

  if (!partners?.length) return null;

  return (
    <section className="py-12 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">সদস্যপদ ও অংশীদার</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 items-center">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Award className="h-8 w-8" />
              <span className="font-medium text-sm">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 16. CTA Section ─── */
function CTASection() {
  return (
    <section className="py-16 bg-gradient-to-r from-cyan-600 to-teal-700 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">সংযুক্ত হতে প্রস্তুত?</h2>
        <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto">
          দ্রুতগতির ফাইবার অপটিক ইন্টারনেট সেবা পেতে এখনই কানেকশন নিন। প্রথম মাসে বিশেষ ছাড়!
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <NavLink to="/new-connection">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 shadow-lg shadow-orange-500/30">
              কানেকশন নিন <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </NavLink>
          <a href="tel:09678123456">
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold px-10">
              <Phone className="mr-2 h-5 w-5" /> কল করুন
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Home Component ─── */
export default function Home() {
  return (
    <>
      <FestivalBanner />
      <HeroSection />
      <StatsSection />
      <LogoMarquee />
      <FiberBanner />
      <FeaturesSection />
      <GamingBanner />
      <PackagePreviewSection />
      <CoverageCheck />
      <HowToConnectSection />
      <TestimonialsSection />
      <PartnersSection />
      <CTASection />
    </>
  );
}
