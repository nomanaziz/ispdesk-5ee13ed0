import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompactPackages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["public-packages-compact"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price");
      return data || [];
    },
  });

  return (
    <>
      <BreadcrumbBanner title="সকল প্যাকেজ" subtitle="দ্রুত একনজরে" breadcrumbs={[{ label: "প্যাকেজ" }]} />
      <section className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {packages?.map((p) => (
                <Card key={p.id} className="border-cyan-100 bg-white hover:border-cyan-400 hover:shadow-md transition-all">
                  <CardContent className="p-4 text-center">
                    <Package className="h-6 w-6 text-cyan-600 mx-auto mb-2" />
                    <h3 className="font-bold text-sm text-slate-900 truncate mb-1">{p.name}</h3>
                    <div className="text-[11px] text-slate-500 mb-2">↓{p.bandwidth_down}M | ↑{p.bandwidth_up}M</div>
                    <div className="text-2xl font-extrabold text-cyan-600 mb-2">৳{Number(p.price || 0).toLocaleString()}</div>
                    <NavLink to="/new-connection">
                      <Button size="sm" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-8">নিন</Button>
                    </NavLink>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
