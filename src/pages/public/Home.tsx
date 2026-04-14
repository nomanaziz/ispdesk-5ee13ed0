import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wifi, Shield, Clock, Headphones, Zap, Globe, ChevronRight, Users, MapPin, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-blue-800 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-teal-300 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            দ্রুতগতির <span className="text-teal-300">ইন্টারনেট</span> সংযোগ
          </h1>
          <p className="text-lg md:text-xl text-teal-100 mb-8 leading-relaxed max-w-2xl">
            আমরা প্রদান করি সাশ্রয়ী মূল্যে উচ্চ গতির ফাইবার অপটিক ইন্টারনেট সেবা। ২৪/৭ কাস্টমার সাপোর্ট এবং ৯৯.৯% আপটাইম গ্যারান্টি।
          </p>
          <div className="flex flex-wrap gap-4">
            <NavLink to="/packages">
              <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold text-base px-8">
                প্যাকেজ দেখুন <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </NavLink>
            <NavLink to="/new-connection">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold text-base px-8">
                কানেকশন নিন
              </Button>
            </NavLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-white -mt-8 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, value: "৫০০০+", label: "সক্রিয় গ্রাহক" },
            { icon: MapPin, value: "১৫+", label: "কভারেজ এলাকা" },
            { icon: Zap, value: "৯৯.৯%", label: "আপটাইম" },
            { icon: Headphones, value: "২৪/৭", label: "সাপোর্ট" },
          ].map((stat, i) => (
            <Card key={i} className="border-slate-200 shadow-lg bg-white">
              <CardContent className="p-5 text-center">
                <stat.icon className="h-7 w-7 text-teal-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
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
    { icon: Zap, title: "আল্ট্রা ফাস্ট স্পিড", desc: "১০০ Mbps পর্যন্ত ডাউনলোড স্পিড সহ বাফারিং-মুক্ত অভিজ্ঞতা।" },
    { icon: Shield, title: "নিরাপদ সংযোগ", desc: "এন্টারপ্রাইজ গ্রেড ফায়ারওয়াল ও DDoS প্রটেকশন।" },
    { icon: Clock, title: "সার্বক্ষণিক সেবা", desc: "৩৬৫ দিন ২৪ ঘণ্টা টেকনিক্যাল সাপোর্ট।" },
    { icon: Globe, title: "ফাইবার অপটিক", desc: "সরাসরি ফাইবার সংযোগ দ্বারা সর্বোচ্চ স্থিতিশীলতা।" },
    { icon: Wifi, title: "ফ্রি রাউটার", desc: "কানেকশনের সাথে ফ্রি ওয়াই-ফাই রাউটার।" },
    { icon: Headphones, title: "দ্রুত সমাধান", desc: "সমস্যার রিপোর্ট করার ২ ঘণ্টার মধ্যে সমাধান।" },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">কেন আমাদের বেছে নেবেন?</h2>
          <p className="text-slate-500 max-w-xl mx-auto">আমরা সর্বোচ্চ মানের ইন্টারনেট সেবা প্রদান করি</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="border-slate-200 bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
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
    queryKey: ["public-packages"],
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
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">আমাদের প্যাকেজ সমূহ</h2>
          <p className="text-slate-500">আপনার প্রয়োজন অনুযায়ী প্যাকেজ বেছে নিন</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages?.map((pkg) => (
            <Card key={pkg.id} className="border-slate-200 hover:border-teal-300 transition-colors hover:shadow-lg">
              <CardContent className="p-6 text-center">
                <Package className="h-8 w-8 text-teal-600 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900 mb-1">{pkg.name}</h3>
                <div className="text-sm text-slate-500 mb-3">
                  {pkg.bandwidth_down} Mbps / {pkg.bandwidth_up} Mbps
                </div>
                <div className="text-3xl font-extrabold text-teal-600 mb-1">
                  ৳{pkg.price}
                </div>
                <div className="text-xs text-slate-400 mb-4">মাসিক</div>
                <NavLink to="/new-connection">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white" size="sm">
                    কানেকশন নিন
                  </Button>
                </NavLink>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-8">
          <NavLink to="/packages">
            <Button variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50">
              সব প্যাকেজ দেখুন <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </NavLink>
        </div>
      </div>
    </section>
  );
}

function HowToConnectSection() {
  const steps = [
    { step: "১", title: "প্যাকেজ নির্বাচন", desc: "আপনার পছন্দের স্পিড প্যাকেজ বেছে নিন।" },
    { step: "২", title: "আবেদন করুন", desc: "অনলাইনে বা ফোনে কানেকশনের জন্য আবেদন করুন।" },
    { step: "৩", title: "ইনস্টলেশন", desc: "আমাদের টিম আপনার বাসায় এসে সংযোগ দেবে।" },
    { step: "৪", title: "ইন্টারনেট উপভোগ", desc: "দ্রুতগতির ইন্টারনেট ব্যবহার শুরু করুন!" },
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">কিভাবে সংযোগ নেবেন?</h2>
          <p className="text-slate-400">মাত্র ৪টি সহজ ধাপে ইন্টারনেট সংযোগ পান</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="h-16 w-16 rounded-full bg-teal-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {s.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-teal-600 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">আজই সংযোগ নিন!</h2>
        <p className="text-teal-100 text-lg mb-8">দ্রুতগতির ফাইবার অপটিক ইন্টারনেট সেবা পেতে এখনই আবেদন করুন।</p>
        <div className="flex flex-wrap justify-center gap-4">
          <NavLink to="/new-connection">
            <Button size="lg" className="bg-white text-teal-700 hover:bg-teal-50 font-semibold px-8">
              কানেকশন নিন
            </Button>
          </NavLink>
          <NavLink to="/packages">
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold px-8">
              প্যাকেজ দেখুন
            </Button>
          </NavLink>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <PackagePreviewSection />
      <HowToConnectSection />
      <CTASection />
    </>
  );
}
