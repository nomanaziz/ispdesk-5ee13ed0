import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Award, Users, MapPin, Clock, Star, Wifi, Building } from "lucide-react";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const timeline = [
  { year: "২০১৮", title: "যাত্রা শুরু", desc: "মাত্র ৫০ জন গ্রাহক নিয়ে আমাদের পথচলা শুরু।" },
  { year: "২০১৯", title: "ফাইবার নেটওয়ার্ক", desc: "সম্পূর্ণ ফাইবার অপটিক নেটওয়ার্কে রূপান্তর।" },
  { year: "২০২০", title: "১০০০+ গ্রাহক", desc: "গ্রাহক সংখ্যা ১০০০ ছাড়িয়ে যায়।" },
  { year: "২০২১", title: "BDIX সংযোগ", desc: "BDIX ক্যাশ সার্ভার সংযুক্তি।" },
  { year: "২০২২", title: "শাখা সম্প্রসারণ", desc: "একাধিক এলাকায় শাখা উন্মুক্ত।" },
  { year: "২০২৩", title: "৫০০০+ গ্রাহক", desc: "বাংলাদেশের অন্যতম বিশ্বস্ত ISP হিসেবে প্রতিষ্ঠিত।" },
];

export default function About() {
  const { data: partners } = useQuery({
    queryKey: ["public-partners-about"],
    queryFn: async () => {
      const { data } = await supabase.from("website_partners").select("*").eq("status", "active").order("sort_order");
      return data || [];
    },
  });

  const { data: team } = useQuery({
    queryKey: ["public-team"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name, phone, department_id, position_id, departments(name), positions(name)")
        .eq("show_on_website", true)
        .eq("status", "active")
        .limit(8);
      return data || [];
    },
  });

  return (
    <>
      <BreadcrumbBanner
        title="আমাদের সম্পর্কে"
        subtitle="বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী প্রতিষ্ঠান"
        breadcrumbs={[{ label: "আমাদের সম্পর্কে" }]}
      />

      {/* Stats cards */}
      <div className="bg-white py-10 border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: Users, value: "৫০০০+", label: "সন্তুষ্ট গ্রাহক", color: "text-cyan-600 bg-cyan-50" },
            { icon: MapPin, value: "১৫+", label: "কভারেজ এলাকা", color: "text-orange-600 bg-orange-50" },
            { icon: Clock, value: "৫+ বছর", label: "অভিজ্ঞতা", color: "text-green-600 bg-green-50" },
            { icon: Star, value: "৯৯.৯%", label: "আপটাইম", color: "text-purple-600 bg-purple-50" },
          ].map((s, i) => (
            <Card key={i} className="border-slate-200 bg-white text-center">
              <CardContent className="p-5">
                <div className={`h-12 w-12 rounded-xl ${s.color.split(" ")[1]} flex items-center justify-center mx-auto mb-3`}>
                  <s.icon className={`h-6 w-6 ${s.color.split(" ")[0]}`} />
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mission/Vision/Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { icon: Target, title: "আমাদের লক্ষ্য", desc: "সবার জন্য সাশ্রয়ী মূল্যে উচ্চ গতির ইন্টারনেট সংযোগ নিশ্চিত করা।" },
              { icon: Eye, title: "আমাদের দৃষ্টিভঙ্গি", desc: "দেশের প্রতিটি কোণায় ডিজিটাল সংযুক্ততা পৌঁছে দেওয়া।" },
              { icon: Award, title: "আমাদের প্রতিশ্রুতি", desc: "সর্বোচ্চ মানের সেবা ও গ্রাহক সন্তুষ্টি নিশ্চিত করা।" },
            ].map((item, i) => (
              <Card key={i} className="border-slate-200 bg-white hover:shadow-lg transition-all">
                <CardContent className="p-6 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-8 w-8 text-cyan-600" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Our Story */}
          <Card className="border-slate-200 bg-white mb-16">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">আমাদের গল্প</h2>
              <div className="text-slate-600 space-y-4 leading-relaxed">
                <p>
                  আমরা বিশ্বাস করি যে ইন্টারনেট একটি মৌলিক প্রয়োজন। তাই আমরা প্রতিনিয়ত চেষ্টা করি সবার জন্য নির্ভরযোগ্য ও সাশ্রয়ী মূল্যে ইন্টারনেট সেবা প্রদান করতে।
                </p>
                <p>
                  আমাদের দক্ষ প্রযুক্তি দল সর্বদা নেটওয়ার্ক মনিটরিং করে এবং যেকোনো সমস্যা দ্রুত সমাধান করে। আমরা সর্বশেষ ফাইবার অপটিক প্রযুক্তি ব্যবহার করি যাতে আমাদের গ্রাহকরা সর্বোচ্চ গতি ও স্থিতিশীলতা পান।
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">আমাদের পথচলা</h2>
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 bg-cyan-200 hidden md:block" />
              <div className="space-y-8">
                {timeline.map((item, i) => (
                  <div key={i} className={`flex flex-col md:flex-row items-center gap-4 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                    <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                      <Card className="border-slate-200 bg-white inline-block">
                        <CardContent className="p-5">
                          <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-lg z-10 flex-shrink-0">
                      {item.year}
                    </div>
                    <div className="flex-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team */}
          {team && team.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">আমাদের দল</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {team.map((member: any) => (
                  <Card key={member.id} className="border-slate-200 bg-white text-center hover:shadow-lg transition-all">
                    <CardContent className="p-5">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                        {member.name?.charAt(0)}
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm">{member.name}</h3>
                      {member.positions && <p className="text-xs text-cyan-600">{(member.positions as any)?.name}</p>}
                      {member.departments && <p className="text-xs text-slate-400">{(member.departments as any)?.name}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Partners */}
          {partners && partners.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">আমাদের অংশীদার</h2>
              <div className="flex flex-wrap justify-center gap-6">
                {partners.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-6 py-4 hover:shadow-md transition-all">
                    <Building className="h-6 w-6 text-cyan-600" />
                    <span className="font-medium text-slate-700">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
