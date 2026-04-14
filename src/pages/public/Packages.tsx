import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function Packages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["public-packages-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("isp_packages")
        .select("*")
        .eq("status", "active")
        .order("price", { ascending: true });
      return data || [];
    },
  });

  return (
    <div className="py-16 bg-slate-50 min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">ইন্টারনেট প্যাকেজ সমূহ</h1>
          <p className="text-slate-500 max-w-xl mx-auto">আপনার প্রয়োজন অনুযায়ী সেরা প্যাকেজটি বেছে নিন</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {packages?.map((pkg) => (
              <Card key={pkg.id} className="border-slate-200 hover:border-teal-300 transition-all hover:shadow-lg bg-white">
                <CardContent className="p-6 text-center">
                  <Package className="h-10 w-10 text-teal-600 mx-auto mb-4" />
                  <h3 className="font-bold text-xl text-slate-900 mb-1">{pkg.name}</h3>
                  {pkg.code && <div className="text-xs text-slate-400 mb-2">{pkg.code}</div>}
                  <div className="text-sm text-slate-500 mb-2">
                    ↓ {pkg.bandwidth_down} Mbps &nbsp;|&nbsp; ↑ {pkg.bandwidth_up} Mbps
                  </div>
                  <div className="text-4xl font-extrabold text-teal-600 my-4">
                    ৳{pkg.price}
                    <span className="text-sm font-normal text-slate-400">/মাস</span>
                  </div>
                  {pkg.setup_fee && pkg.setup_fee > 0 && (
                    <div className="text-xs text-slate-400 mb-4">ইনস্টলেশন ফি: ৳{pkg.setup_fee}</div>
                  )}
                  <NavLink to="/new-connection">
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      কানেকশন নিন <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </NavLink>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && packages?.length === 0 && (
          <div className="text-center py-12 text-slate-400">কোনো প্যাকেজ পাওয়া যায়নি।</div>
        )}
      </div>
    </div>
  );
}
