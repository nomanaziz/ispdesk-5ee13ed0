import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wifi } from "lucide-react";

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
      name: form.name,
      contact: form.contact,
      email: form.email || null,
      address: form.address || null,
      zone_id: form.zone_id || null,
      package_id: form.package_id || null,
      connection_type: form.connection_type || null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) {
      toast({ title: "সমস্যা হয়েছে", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "আবেদন সফল!", description: "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।" });
      setForm({ name: "", contact: "", email: "", address: "", zone_id: "", package_id: "", connection_type: "", notes: "" });
    }
  };

  return (
    <div className="py-16 bg-slate-50 min-h-[60vh]">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <Wifi className="h-10 w-10 text-teal-600 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">নতুন কানেকশনের আবেদন</h1>
          <p className="text-slate-500">ফর্মটি পূরণ করুন, আমরা আপনার সাথে যোগাযোগ করবো</p>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">নাম *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white border-slate-200 text-slate-900" placeholder="আপনার নাম" />
                </div>
                <div>
                  <Label className="text-slate-700">ফোন নম্বর *</Label>
                  <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-white border-slate-200 text-slate-900" placeholder="০১XXXXXXXXX" />
                </div>
                <div>
                  <Label className="text-slate-700">ইমেইল</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white border-slate-200 text-slate-900" placeholder="email@example.com" />
                </div>
                <div>
                  <Label className="text-slate-700">এলাকা</Label>
                  <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue placeholder="এলাকা নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {zones?.map((z) => (<SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700">প্যাকেজ</Label>
                  <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue placeholder="প্যাকেজ নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {packages?.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} - ৳{p.price}/মাস</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-700">সংযোগের ধরণ</Label>
                  <Select value={form.connection_type} onValueChange={(v) => setForm({ ...form, connection_type: v })}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue placeholder="সংযোগের ধরণ" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fiber">ফাইবার</SelectItem>
                      <SelectItem value="Wireless">ওয়্যারলেস</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-slate-700">ঠিকানা</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-white border-slate-200 text-slate-900" placeholder="আপনার সম্পূর্ণ ঠিকানা" />
              </div>
              <div>
                <Label className="text-slate-700">মন্তব্য</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-white border-slate-200 text-slate-900" placeholder="অতিরিক্ত তথ্য..." rows={3} />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                {loading ? "জমা হচ্ছে..." : "আবেদন জমা দিন"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
