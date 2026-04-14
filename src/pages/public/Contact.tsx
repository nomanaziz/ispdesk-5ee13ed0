import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Clock, Send, MessageCircle, Facebook } from "lucide-react";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "বার্তা পাঠানো হয়েছে!", description: "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।" });
    setForm({ name: "", phone: "", email: "", message: "" });
  };

  return (
    <>
      <BreadcrumbBanner
        title="যোগাযোগ"
        subtitle="আমাদের সাথে যোগাযোগ করুন"
        breadcrumbs={[{ label: "যোগাযোগ" }]}
      />

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact info */}
            <div className="space-y-5">
              {[
                { icon: Phone, title: "হেল্পলাইন", value: "০৯৬৭৮-১২৩৪৫৬", desc: "সকাল ৯টা - রাত ১০টা", color: "bg-cyan-50 text-cyan-600" },
                { icon: Mail, title: "ইমেইল", value: "info@ispdesk.com", desc: "২৪ ঘণ্টার মধ্যে উত্তর", color: "bg-orange-50 text-orange-600" },
                { icon: MapPin, title: "অফিস", value: "আপনার ঠিকানা", desc: "বাংলাদেশ", color: "bg-green-50 text-green-600" },
                { icon: Clock, title: "সেবা সময়", value: "সকাল ৯টা - রাত ১০টা", desc: "সপ্তাহে ৭ দিন", color: "bg-purple-50 text-purple-600" },
              ].map((item, i) => (
                <Card key={i} className="border-slate-200 bg-white hover:shadow-md transition-all">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl ${item.color.split(" ")[0]} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`h-6 w-6 ${item.color.split(" ")[1]}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{item.title}</p>
                      <p className="font-bold text-slate-900">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Social */}
              <div className="flex gap-3">
                <a href="#" className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="h-12 w-12 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">বার্তা পাঠান</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-700 font-medium">নাম</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="আপনার নাম" />
                      </div>
                      <div>
                        <Label className="text-slate-700 font-medium">ফোন</Label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="০১XXXXXXXXX" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">ইমেইল</Label>
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="email@example.com" />
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">বার্তা</Label>
                      <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="আপনার বার্তা লিখুন..." rows={5} />
                    </div>
                    <Button type="submit" size="lg" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
                      <Send className="mr-2 h-5 w-5" /> বার্তা পাঠান
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
