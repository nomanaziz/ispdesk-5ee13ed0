import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Coverage() {
  const [search, setSearch] = useState("");

  const { data: zones, isLoading } = useQuery({
    queryKey: ["public-zones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("zones")
        .select("*, sub_zones(id, name, status)")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  const filtered = zones?.filter(
    (z: any) => z.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="py-16 bg-slate-50 min-h-[60vh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">কভারেজ এরিয়া</h1>
          <p className="text-slate-500">আমাদের সেবা যেসব এলাকায় পাওয়া যায়</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="এলাকার নাম লিখুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200 text-slate-900"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-400">লোড হচ্ছে...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((zone: any) => (
              <Card key={zone.id} className="border-slate-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="h-5 w-5 text-teal-600" />
                    <h3 className="font-semibold text-slate-900">{zone.name}</h3>
                  </div>
                  {zone.sub_zones?.length > 0 && (
                    <div className="ml-8 text-sm text-slate-500 space-y-1">
                      {zone.sub_zones
                        .filter((s: any) => s.status === "active")
                        .map((sub: any) => (
                          <div key={sub.id}>• {sub.name}</div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filtered?.length === 0 && (
          <div className="text-center py-12 text-slate-400">এই এলাকায় এখনো সেবা চালু হয়নি।</div>
        )}
      </div>
    </div>
  );
}
