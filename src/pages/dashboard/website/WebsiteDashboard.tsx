import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Bell, Gift, Star, Users, Layers, Server, PartyPopper, Menu, Image, Settings } from "lucide-react";

const countQuery = async (table: string, filter?: { col: string; val: string }) => {
  let q = (supabase as any).from(table).select("id", { count: "exact", head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count, error } = await q;
  if (error) return 0;
  return count || 0;
};

export default function WebsiteDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["website_dashboard_stats"],
    queryFn: async () => {
      const [pages, notices, offers, testimonials, partners, features, services, festivals, menuItems, media, settings] = await Promise.all([
        countQuery("website_pages"),
        countQuery("website_notices"),
        countQuery("website_offers"),
        countQuery("website_testimonials"),
        countQuery("website_partners"),
        countQuery("website_features"),
        countQuery("website_services"),
        countQuery("website_festivals"),
        countQuery("website_menu"),
        countQuery("website_media"),
        countQuery("landing_content", { col: "section", val: "settings" }),
      ]);
      return { pages, notices, offers, testimonials, partners, features, services, festivals, menuItems, media, settings };
    },
  });

  const cards = [
    { label: "পেজ", count: stats?.pages, icon: FileText, color: "text-blue-500" },
    { label: "নোটিশ", count: stats?.notices, icon: Bell, color: "text-orange-500" },
    { label: "অফার", count: stats?.offers, icon: Gift, color: "text-green-500" },
    { label: "টেস্টিমোনিয়াল", count: stats?.testimonials, icon: Star, color: "text-yellow-500" },
    { label: "পার্টনার", count: stats?.partners, icon: Users, color: "text-purple-500" },
    { label: "ফিচার", count: stats?.features, icon: Layers, color: "text-cyan-500" },
    { label: "সার্ভিস", count: stats?.services, icon: Server, color: "text-indigo-500" },
    { label: "উৎসব", count: stats?.festivals, icon: PartyPopper, color: "text-pink-500" },
    { label: "মেনু আইটেম", count: stats?.menuItems, icon: Menu, color: "text-teal-500" },
    { label: "মিডিয়া", count: stats?.media, icon: Image, color: "text-rose-500" },
    { label: "সেটিংস", count: stats?.settings, icon: Settings, color: "text-gray-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">ওয়েবসাইট ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground">ওয়েবসাইট কন্টেন্ট এর সারসংক্ষেপ</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{card.count}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
