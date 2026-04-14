import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wifi, Clock, Shield, Headphones, Check, ArrowRight } from "lucide-react";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";

export default function NewConnection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", contact: "", email: "", address: "",
    zone_id: "", package_id: "", connection_type: "", notes: "",
  });

  const { data: zones } = useQuery({
    queryKey: ["public-zones-select"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["public-packages-select"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("id, name, price").eq("status", "active").order("price");
      return data || [];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contact) {
      toast({ title: "নাম ও ফোন নম্বর আবশ্যক", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("client_requests").insert({
      name: form.name, contact: form.contact,
      email: form.email || null, address: form.address || null,
      zone_id: form.zone_id || null, package_id: form.package_id || null,
      connection_type: form.connection_type || null, notes: form.notes || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "সমস্যা হয়েছে", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "আবেদন সফল!", description: "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।" });
      setForm({ name: "", contact: "", email: "", address: "", zone_id: "", package_id: "", connection_type: "", notes: "" });
    }
  };

  const benefits = [
    { icon: Clock, title: "দ্রুত ইনস্টলেশন", desc: "আবেদনের ২৪ ঘণ্টার মধ্যে সংযোগ" },
    { icon: Shield, title: "ফ্রি রাউটার সেটআপ", desc: "ওয়াই-ফাই রাউটার কনফিগারেশন বিনামূল্যে" },
    { icon: Headphones, title: "২৪/৭ সাপোর্ট", desc: "যেকোনো সময় টেকনিক্যাল সাহায্য" },
  ];

  return (
    <>
      <BreadcrumbBanner
        title="নতুন কানেকশন"
        subtitle="ফর্মটি পূরণ করুন, আমরা আপনার সাথে যোগাযোগ করবো"
        breadcrumbs={[{ label: "নতুন কানেকশন" }]}
      />

      {/* Benefit cards */}
      <div className="bg-white border-b border-slate-100 py-6">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-cyan-50 rounded-xl px-5 py-4">
              <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <b.icon className="h-5 w-5 text-cyan-700" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{b.title}</p>
                <p className="text-xs text-slate-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-6">আবেদন ফর্ম</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-700 font-medium">নাম *</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="আপনার নাম" />
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">ফোন নম্বর *</Label>
                      <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="০১XXXXXXXXX" />
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">ইমেইল</Label>
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="email@example.com" />
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">এলাকা</Label>
                      <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 mt-1"><SelectValue placeholder="এলাকা নির্বাচন করুন" /></SelectTrigger>
                        <SelectContent>
                          {zones?.map((z) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">প্যাকেজ</Label>
                      <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 mt-1"><SelectValue placeholder="প্যাকেজ নির্বাচন" /></SelectTrigger>
                        <SelectContent>
                          {packages?.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} - ৳{p.price}/মাস</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-700 font-medium">সংযোগের ধরণ</Label>
                      <Select value={form.connection_type} onValueChange={(v) => setForm({ ...form, connection_type: v })}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 mt-1"><SelectValue placeholder="সংযোগের ধরণ" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fiber">ফাইবার</SelectItem>
                          <SelectItem value="Wireless">ওয়্যারলেস</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-700 font-medium">ঠিকানা</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="আপনার সম্পূর্ণ ঠিকানা" />
                  </div>
                  <div>
                    <Label className="text-slate-700 font-medium">মন্তব্য</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900 mt-1" placeholder="অতিরিক্ত তথ্য..." rows={3} />
                  </div>
                  <Button type="submit" disabled={loading} size="lg" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
                    {loading ? "জমা হচ্ছে..." : "আবেদন জমা দিন"} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-slate-200 bg-gradient-to-br from-cyan-600 to-teal-700 text-white">
              <CardContent className="p-6">
                <Wifi className="h-10 w-10 mb-4" />
                <h3 className="font-bold text-lg mb-3">কেন আমাদের বেছে নেবেন?</h3>
                <ul className="space-y-3 text-sm">
                  {["৯৯.৯% আপটাইম গ্যারান্টি", "BDIX ও ক্যাশ সার্ভার", "ফাইবার অপটিক নেটওয়ার্ক", "কোনো লুকানো চার্জ নেই", "ফ্রি রাউটার কনফিগারেশন", "২৪/৭ টেকনিক্যাল সাপোর্ট"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-teal-300 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 mb-3">ফোনে আবেদন করুন</h3>
                <p className="text-sm text-slate-500 mb-3">সরাসরি কল করে কানেকশনের জন্য আবেদন করতে পারেন।</p>
                <a href="tel:09678123456" className="text-lg font-bold text-cyan-600 hover:text-cyan-700">
                  ০৯৬৭৮-১২৩৪৫৬
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
