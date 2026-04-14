import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Coverage() {
  const [search, setSearch] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");

  const { data: zones, isLoading } = useQuery({
    queryKey: ["public-zones-coverage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("zones")
        .select("*, sub_zones(id, name, status)")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  const { data: districts } = useQuery({
    queryKey: ["public-districts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("districts")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  const filtered = zones?.filter(
    (z: any) => z.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <BreadcrumbBanner
        title="কভারেজ এরিয়া"
        subtitle="আমাদের সেবা যেসব এলাকায় পাওয়া যায়"
        breadcrumbs={[{ label: "কভারেজ" }]}
      />

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search & filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="এলাকার নাম লিখুন..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 text-slate-900 h-11"
                />
              </div>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-11">
                  <SelectValue placeholder="জেলা নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল জেলা</SelectItem>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Zone count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              মোট <span className="font-semibold text-slate-900">{filtered?.length || 0}</span> টি জোন পাওয়া গেছে
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-400">লোড হচ্ছে...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered?.map((zone: any) => (
                <Card key={zone.id} className="border-slate-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-5 w-5 text-cyan-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{zone.name}</h3>
                        <p className="text-xs text-slate-400">{zone.sub_zones?.filter((s: any) => s.status === "active").length || 0} টি সাব-জোন</p>
                      </div>
                    </div>
                    {zone.sub_zones?.filter((s: any) => s.status === "active").length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {zone.sub_zones
                          .filter((s: any) => s.status === "active")
                          .map((sub: any) => (
                            <span key={sub.id} className="text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full border border-slate-100">
                              {sub.name}
                            </span>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && filtered?.length === 0 && (
            <div className="text-center py-16">
              <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">এই এলাকায় এখনো সেবা চালু হয়নি।</p>
              <p className="text-slate-400 text-sm mt-1">অনুগ্রহ করে অন্য এলাকা খুঁজুন বা আমাদের সাথে যোগাযোগ করুন।</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
