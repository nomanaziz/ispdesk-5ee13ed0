import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, Check } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { Skeleton } from "@/components/ui/skeleton";

export default function CardFlipPackages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["public-packages-flip"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price");
      return data || [];
    },
  });

  return (
    <>
      <BreadcrumbBanner title="প্যাকেজ সমূহ" subtitle="হোভার করে বিস্তারিত দেখুন" breadcrumbs={[{ label: "প্যাকেজ" }]} />
      <section className="py-16 bg-gradient-to-br from-violet-50 to-purple-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 [perspective:1200px]">
              {packages?.map((p) => (
                <div key={p.id} className="group relative h-72 [transform-style:preserve-3d] transition-transform duration-700 hover:[transform:rotateY(180deg)]">
                  {/* Front */}
                  <div className="absolute inset-0 [backface-visibility:hidden] bg-white rounded-2xl border border-slate-200 shadow-lg p-6 flex flex-col items-center justify-center text-center">
                    <Package className="h-12 w-12 text-violet-600 mb-4" />
                    <h3 className="font-bold text-2xl text-slate-900 mb-2">{p.name}</h3>
                    <div className="text-4xl font-extrabold text-violet-600 my-3">৳{Number(p.price || 0).toLocaleString()}</div>
                    <div className="text-sm text-slate-500">↓ {p.bandwidth_down} Mbps | ↑ {p.bandwidth_up} Mbps</div>
                    <div className="text-xs text-slate-400 mt-4">হোভার করুন →</div>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl shadow-lg p-6 flex flex-col">
                    <h3 className="font-bold text-lg mb-3">{p.name}</h3>
                    <ul className="space-y-2 text-sm mb-4 flex-1">
                      {["BDIX Speed", "FTP Access", "২৪/৭ সাপোর্ট", "ফ্রি ইনস্টলেশন"].map((f) => (
                        <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-300" /> {f}</li>
                      ))}
                    </ul>
                    <NavLink to="/new-connection">
                      <Button className="w-full bg-white text-violet-700 hover:bg-violet-50">কানেকশন নিন</Button>
                    </NavLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
