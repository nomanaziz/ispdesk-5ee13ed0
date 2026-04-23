import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";

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

  const cards: { label: string; count: number | undefined; icons8: string }[] = [
    { label: "পেজ", count: stats?.pages, icons8: "opened-folder" },
    { label: "নোটিশ", count: stats?.notices, icons8: "news" },
    { label: "অফার", count: stats?.offers, icons8: "discount" },
    { label: "টেস্টিমোনিয়াল", count: stats?.testimonials, icons8: "star" },
    { label: "পার্টনার", count: stats?.partners, icons8: "people" },
    { label: "ফিচার", count: stats?.features, icons8: "stack" },
    { label: "সার্ভিস", count: stats?.services, icons8: "server" },
    { label: "উৎসব", count: stats?.festivals, icons8: "gift" },
    { label: "মেনু আইটেম", count: stats?.menuItems, icons8: "menu" },
    { label: "মিডিয়া", count: stats?.media, icons8: "gallery" },
    { label: "সেটিংস", count: stats?.settings, icons8: "settings" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ওয়েবসাইট ড্যাশবোর্ড" description="ওয়েবসাইট কন্টেন্ট এর সারসংক্ষেপ" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          isLoading ? (
            <Skeleton key={card.label} className="h-20 w-full" />
          ) : (
            <StatCard key={card.label} label={card.label} value={card.count ?? 0} icons8={card.icons8} />
          )
        ))}
      </div>
    </div>
  );
}
