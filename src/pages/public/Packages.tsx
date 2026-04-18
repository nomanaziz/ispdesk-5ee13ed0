import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, Check, Server, HardDrive, Database } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbBanner } from "@/components/public/BreadcrumbBanner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { calcVat } from "@/lib/vat";

const tabs = [
  { label: "সকল", value: "all" },
  { label: "হোম", value: "home" },
  { label: "কর্পোরেট", value: "corporate" },
  { label: "ডেডিকেটেড", value: "dedicated" },
];

export default function Packages() {
  const [activeTab, setActiveTab] = useState("all");
  const [previewVatOn, setPreviewVatOn] = useState(false);
  const [previewVatPct, setPreviewVatPct] = useState(5);

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

  const filtered = activeTab === "all"
    ? packages
    : packages?.filter((p) => {
        if (activeTab === "home") return (p.price || 0) <= 1000;
        if (activeTab === "corporate") return (p.price || 0) > 1000 && (p.price || 0) <= 3000;
        return (p.price || 0) > 3000;
      });

  return (
    <>
      <BreadcrumbBanner
        title="ইন্টারনেট প্যাকেজ সমূহ"
        subtitle="আপনার প্রয়োজন অনুযায়ী সেরা প্যাকেজটি বেছে নিন"
        breadcrumbs={[{ label: "প্যাকেজ" }]}
      />

      {/* Highlight badges */}
      <div className="bg-white border-b border-slate-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-4">
          {[
            { icon: Server, label: "BDIX Speed" },
            { icon: HardDrive, label: "FTP Access" },
            { icon: Database, label: "Cache Server" },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-full">
              <b.icon className="h-4 w-4 text-cyan-600" />
              <span className="font-medium">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="py-12 bg-slate-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  activeTab === tab.value
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* VAT preview toggle for VAT-less packages */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8 bg-white border border-slate-200 rounded-xl px-4 py-3 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <Switch checked={previewVatOn} onCheckedChange={setPreviewVatOn} id="vat-toggle" />
              <label htmlFor="vat-toggle" className="text-sm font-medium text-slate-700 cursor-pointer">
                VAT সহ দেখুন (Preview)
              </label>
            </div>
            {previewVatOn && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">VAT %:</span>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={previewVatPct}
                  onChange={(e) => setPreviewVatPct(parseFloat(e.target.value) || 0)}
                  className="h-8 w-20"
                />
                <span className="text-xs text-slate-400">(VAT-হীন প্যাকেজে প্রযোজ্য)</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered?.map((pkg, i) => (
                <Card key={pkg.id} className={cn(
                  "border-slate-200 hover:shadow-xl transition-all duration-300 bg-white relative overflow-hidden",
                  i === 1 && "ring-2 ring-cyan-500"
                )}>
                  {i === 1 && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold text-center py-1">
                      সবচেয়ে জনপ্রিয়
                    </div>
                  )}
                  <CardContent className={cn("p-6 text-center", i === 1 && "pt-10")}>
                    <Package className="h-10 w-10 text-cyan-600 mx-auto mb-4" />
                    <h3 className="font-bold text-xl text-slate-900 mb-1">{pkg.name}</h3>
                    {pkg.code && <div className="text-xs text-slate-400 mb-3">{pkg.code}</div>}

                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <div className="text-sm text-slate-500">
                        ↓ {pkg.bandwidth_down} Mbps &nbsp;|&nbsp; ↑ {pkg.bandwidth_up} Mbps
                      </div>
                    </div>

                    {(() => {
                      const pkgVat = Number((pkg as any).vat_percent) || 0;
                      const includes = (pkg as any).price_includes_vat ?? true;
                      const showBreak = (pkg as any).show_vat_breakdown ?? false;
                      const basePrice = Number(pkg.price) || 0;

                      // If package has its own VAT, honour it. Otherwise, optionally apply preview VAT.
                      const hasOwnVat = pkgVat > 0;
                      const applyPreview = !hasOwnVat && previewVatOn && previewVatPct > 0;
                      const effPct = hasOwnVat ? pkgVat : (applyPreview ? previewVatPct : 0);
                      const effMode: "including" | "excluding" = hasOwnVat
                        ? (includes ? "including" : "excluding")
                        : "excluding"; // preview always treats listed price as base
                      const v = calcVat(basePrice, effPct, effMode);

                      return (
                        <>
                          <div className="text-4xl font-extrabold text-cyan-600 mb-1">
                            ৳{v.total.toLocaleString()}
                            <span className="text-sm font-normal text-slate-400">/মাস</span>
                          </div>
                          {effPct > 0 && effMode === "including" && (
                            <div className="text-[11px] text-slate-500 mb-1">({effPct}% VAT সহ)</div>
                          )}
                          {effPct > 0 && effMode === "excluding" && (
                            <div className="text-[11px] text-slate-500 mb-1">
                              Base ৳{v.base.toLocaleString()} + {effPct}% VAT ৳{v.vat.toLocaleString()}
                            </div>
                          )}
                          {effPct > 0 && effMode === "including" && showBreak && (
                            <div className="text-[10px] text-slate-400 mb-1">
                              Base ৳{v.base.toLocaleString()} + VAT ৳{v.vat.toLocaleString()}
                            </div>
                          )}
                          {applyPreview && (
                            <div className="text-[10px] text-amber-600 mb-1">Preview only</div>
                          )}
                        </>
                      );
                    })()}

                    {pkg.setup_fee && pkg.setup_fee > 0 && (
                      <div className="text-xs text-slate-400 mb-4">ইনস্টলেশন ফি: ৳{pkg.setup_fee}</div>
                    )}

                    {/* Feature badges */}
                    <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                      {["BDIX", "FTP", "Cache"].map((badge) => (
                        <span key={badge} className="text-[10px] font-semibold bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full border border-cyan-100">{badge}</span>
                      ))}
                    </div>

                    {/* Feature list */}
                    <ul className="text-left text-sm text-slate-600 space-y-2 mb-5">
                      {["রিয়েল আইপি", "২৪/৭ সাপোর্ট", "ফ্রি রাউটার কনফিগ"].map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <NavLink to="/new-connection">
                      <Button className={cn(
                        "w-full font-semibold",
                        i === 1 ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                      )}>
                        কানেকশন নিন <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </NavLink>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && filtered?.length === 0 && (
            <div className="text-center py-12 text-slate-400">এই ক্যাটেগরিতে কোনো প্যাকেজ পাওয়া যায়নি।</div>
          )}
        </div>
      </div>
    </>
  );
}
