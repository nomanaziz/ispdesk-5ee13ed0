import { Card, CardContent } from "@/components/ui/card";
import { Target, Eye, Award } from "lucide-react";

export default function About() {
  return (
    <div className="py-16 bg-slate-50 min-h-[60vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">আমাদের সম্পর্কে</h1>
          <p className="text-slate-500 max-w-2xl mx-auto">
            আমরা একটি বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী প্রতিষ্ঠান। দীর্ঘদিন ধরে আমরা মানসম্মত ইন্টারনেট সেবা প্রদান করে আসছি।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Target, title: "আমাদের লক্ষ্য", desc: "সবার জন্য সাশ্রয়ী মূল্যে উচ্চ গতির ইন্টারনেট সংযোগ নিশ্চিত করা।" },
            { icon: Eye, title: "আমাদের দৃষ্টিভঙ্গি", desc: "দেশের প্রতিটি কোণায় ডিজিটাল সংযুক্ততা পৌঁছে দেওয়া।" },
            { icon: Award, title: "আমাদের প্রতিশ্রুতি", desc: "সর্বোচ্চ মানের সেবা ও গ্রাহক সন্তুষ্টি নিশ্চিত করা।" },
          ].map((item, i) => (
            <Card key={i} className="border-slate-200 bg-white">
              <CardContent className="p-6 text-center">
                <div className="h-14 w-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-teal-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-slate-200 bg-white">
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
      </div>
    </div>
  );
}
