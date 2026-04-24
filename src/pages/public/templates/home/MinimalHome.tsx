import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function MinimalHome() {
  const { data: packages } = useQuery({
    queryKey: ["public-packages-minimal"],
    queryFn: async () => {
      const { data } = await supabase.from("isp_packages").select("*").eq("status", "active").order("price").limit(4);
      return data || [];
    },
  });

  return (
    <>
      <section className="py-40 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-xs font-mono text-slate-400 mb-8 tracking-widest uppercase">— Internet, Simplified —</div>
          <h1 className="text-6xl md:text-8xl font-light text-slate-900 leading-none mb-10 tracking-tight">
            দ্রুত।<br />
            <span className="italic font-serif">নির্ভরযোগ্য।</span><br />
            সরল।
          </h1>
          <p className="text-lg text-slate-500 mb-12 max-w-xl mx-auto">কোনো জটিলতা নেই। শুধু ইন্টারনেট — আপনার যেমনটা প্রয়োজন।</p>
          <NavLink to="/packages">
            <Button size="lg" variant="outline" className="border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-10 h-14 rounded-none text-base">
              দেখুন <ArrowRight className="ml-3 h-5 w-5" />
            </Button>
          </NavLink>
        </div>
      </section>

      <section className="py-24 border-t border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-xs font-mono text-slate-400 mb-12 tracking-widest uppercase text-center">— প্যাকেজ —</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {packages?.map((p) => (
              <div key={p.id} className="flex items-baseline justify-between border-b border-slate-200 pb-6">
                <div>
                  <h3 className="text-2xl font-light text-slate-900">{p.name}</h3>
                  <div className="text-sm text-slate-400 mt-1">{p.bandwidth_down} Mbps</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-light text-slate-900">৳{Number(p.price || 0).toLocaleString()}</div>
                  <NavLink to="/new-connection" className="text-xs text-slate-500 hover:text-slate-900 underline">নিন →</NavLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
