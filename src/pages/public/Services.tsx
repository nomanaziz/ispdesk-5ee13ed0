import { Card, CardContent } from "@/components/ui/card";
import { Wifi, Building2, Globe, Server, Shield, Headphones } from "lucide-react";

const services = [
  { icon: Wifi, title: "ব্রডব্যান্ড ইন্টারনেট", desc: "হোম ইউজারদের জন্য সাশ্রয়ী মূল্যে উচ্চ গতির ইন্টারনেট। HD স্ট্রিমিং, গেমিং এবং দৈনন্দিন ব্যবহারের জন্য উপযুক্ত।" },
  { icon: Globe, title: "ফাইবার অপটিক (FTTH)", desc: "ফাইবার টু দ্য হোম প্রযুক্তি দিয়ে সর্বোচ্চ গতি ও স্থিতিশীলতা। ল্যাটেন্সি-মুক্ত কানেকশন।" },
  { icon: Building2, title: "কর্পোরেট সংযোগ", desc: "ব্যবসা প্রতিষ্ঠানের জন্য ডেডিকেটেড ব্যান্ডউইথ, স্ট্যাটিক আইপি এবং SLA সহ প্রিমিয়াম সেবা।" },
  { icon: Server, title: "হোস্টিং ও সার্ভার", desc: "ওয়েব হোস্টিং, VPS এবং ডেডিকেটেড সার্ভার সলিউশন আপনার অনলাইন উপস্থিতির জন্য।" },
  { icon: Shield, title: "নেটওয়ার্ক সিকিউরিটি", desc: "ফায়ারওয়াল, DDoS প্রটেকশন এবং নেটওয়ার্ক মনিটরিং সেবা।" },
  { icon: Headphones, title: "টেকনিক্যাল সাপোর্ট", desc: "২৪/৭ কাস্টমার কেয়ার এবং অন-সাইট টেকনিক্যাল সাপোর্ট সেবা।" },
];

export default function Services() {
  return (
    <div className="py-16 bg-slate-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">আমাদের সেবা সমূহ</h1>
          <p className="text-slate-500 max-w-xl mx-auto">সকল প্রকার ইন্টারনেট ও নেটওয়ার্কিং সলিউশন</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <Card key={i} className="border-slate-200 bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
                  <s.icon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
