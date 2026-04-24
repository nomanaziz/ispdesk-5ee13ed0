import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { NavLink } from "react-router-dom";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { Skeleton } from "@/components/ui/skeleton";

export default function TablePackages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["public-packages-table"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price");
      return data || [];
    },
  });

  return (
    <>
      <BreadcrumbBanner title="প্যাকেজ তুলনা" subtitle="পাশাপাশি তুলনা করে সিদ্ধান্ত নিন" breadcrumbs={[{ label: "প্যাকেজ" }]} />
      <section className="py-16 bg-white min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="text-left px-6 py-4 font-bold">প্যাকেজ</th>
                    <th className="text-center px-6 py-4 font-bold">ডাউনলোড</th>
                    <th className="text-center px-6 py-4 font-bold">আপলোড</th>
                    <th className="text-center px-6 py-4 font-bold">BDIX</th>
                    <th className="text-center px-6 py-4 font-bold">FTP</th>
                    <th className="text-right px-6 py-4 font-bold">দাম</th>
                    <th className="text-right px-6 py-4 font-bold">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {packages?.map((p, i) => (
                    <tr key={p.id} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                      <td className="px-6 py-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 text-center">{p.bandwidth_down} Mbps</td>
                      <td className="px-6 py-4 text-center">{p.bandwidth_up} Mbps</td>
                      <td className="px-6 py-4 text-center"><Check className="h-4 w-4 text-green-600 inline" /></td>
                      <td className="px-6 py-4 text-center"><Check className="h-4 w-4 text-green-600 inline" /></td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">৳{Number(p.price || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <NavLink to="/new-connection"><Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">নিন</Button></NavLink>
                      </td>
                    </tr>
                  ))}
                  {!packages?.length && (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">কোনো প্যাকেজ নেই</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
