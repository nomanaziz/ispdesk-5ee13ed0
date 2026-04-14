import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, ArrowRight, Calendar, Clock } from "lucide-react";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { NavLink } from "react-router-dom";

export default function Offers() {
  const { data: offers, isLoading } = useQuery({
    queryKey: ["public-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_offers")
        .select("*")
        .eq("status", "active")
        .order("sort_order");
      return data || [];
    },
  });

  return (
    <>
      <BreadcrumbBanner
        title="অফার সমূহ"
        subtitle="আমাদের চলমান বিশেষ অফার ও ডিসকাউন্ট"
        breadcrumbs={[{ label: "অফার" }]}
      />

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">লোড হচ্ছে...</div>
          ) : offers && offers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {offers.map((offer: any) => (
                <Card key={offer.id} className="border-slate-200 bg-white hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-7 w-7 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{offer.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-4">{offer.description}</p>
                        {(offer.start_date || offer.end_date) && (
                          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                            {offer.start_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> শুরু: {new Date(offer.start_date).toLocaleDateString("bn-BD")}
                              </span>
                            )}
                            {offer.end_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> শেষ: {new Date(offer.end_date).toLocaleDateString("bn-BD")}
                              </span>
                            )}
                          </div>
                        )}
                        <NavLink to="/new-connection">
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                            অফার নিন <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </NavLink>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Gift className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">বর্তমানে কোনো অফার চালু নেই।</p>
              <p className="text-slate-400 text-sm mt-1">নতুন অফারের জন্য আমাদের সাথে যুক্ত থাকুন।</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
