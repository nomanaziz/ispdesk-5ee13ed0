import { Wifi, Phone, Mail, MapPin, Facebook, Youtube, MessageCircle, ExternalLink } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import ispDeskLogo from "@/assets/isp-desk-logo.png";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

interface MenuRow { title: string; url: string | null; location: string }

const defaultQuick = [
  { title: "প্যাকেজ সমূহ", url: "/packages" },
  { title: "কভারেজ এরিয়া", url: "/coverage" },
  { title: "নতুন কানেকশন", url: "/new-connection" },
  { title: "বিল পরিশোধ", url: "/quick-pay" },
  { title: "অফার সমূহ", url: "/offers" },
];
const defaultResource = [
  { title: "সেবা সমূহ", url: "/services" },
  { title: "আমাদের সম্পর্কে", url: "/about" },
  { title: "যোগাযোগ", url: "/contact" },
];

export function PublicFooter() {
  const { t } = useLanguage();
  const { data: menus } = useQuery({
    queryKey: ["website_menu", "footer"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("website_menu")
        .select("title,url,location,sort_order,status")
        .in("location", ["footer_quick", "footer_resource"])
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as MenuRow[];
    },
    staleTime: 30_000,
  });

  const { data: footerContent } = useQuery({
    queryKey: ["landing_content", "footer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_content")
        .select("content_key,content_value")
        .eq("section", "footer")
        .eq("is_active", true);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { map[r.content_key] = r.content_value; });
      return map;
    },
    staleTime: 30_000,
  });

  const quickLinks = menus?.filter((m) => m.location === "footer_quick").map((m) => ({ title: m.title, url: m.url || "#" })) || [];
  const resourceLinks = menus?.filter((m) => m.location === "footer_resource").map((m) => ({ title: m.title, url: m.url || "#" })) || [];
  const finalQuick = quickLinks.length > 0 ? quickLinks : defaultQuick;
  const finalResource = resourceLinks.length > 0 ? resourceLinks : defaultResource;

  const { data: company } = useCompanyInfo();
  const brandName = company?.name || footerContent?.brand?.name || "ISP Desk";
  const brandLogo = company?.logo_url || ispDeskLogo;
  const brandTagline = footerContent?.brand?.tagline || "ইন্টারনেট সেবা প্রদানকারী";
  const brandDesc = footerContent?.brand?.description || "আপনার বিশ্বস্ত ইন্টারনেট সেবা প্রদানকারী। দ্রুত, নিরাপদ এবং নির্ভরযোগ্য ফাইবার অপটিক ইন্টারনেট সংযোগ।";
  const phone = footerContent?.contact?.phone || "০৯৬৭৮-১২৩৪৫৬";
  const email = footerContent?.contact?.email || "info@ispdesk.com";
  const address = footerContent?.contact?.address || "আপনার ঠিকানা, বাংলাদেশ";

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-5 bg-white rounded-lg px-3 py-2 inline-flex">
              <img src={brandLogo} alt={brandName} className="h-10 w-auto max-w-[160px] object-contain" />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">{brandDesc}</p>
            <div className="flex items-center gap-3">
              <a href="#" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-cyan-600 flex items-center justify-center transition-colors" aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
              <a href="#" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-red-600 flex items-center justify-center transition-colors" aria-label="YouTube"><Youtube className="h-4 w-4" /></a>
              <a href="#" className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-green-600 flex items-center justify-center transition-colors" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t("দ্রুত লিংক", "Quick Links")}</h3>
            <ul className="space-y-3 text-sm">
              {finalQuick.map((l, i) => (
                <li key={i}>
                  <NavLink to={l.url} className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3" />{l.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t("রিসোর্স", "Resources")}</h3>
            <ul className="space-y-3 text-sm">
              {finalResource.map((l, i) => (
                <li key={i}>
                  <NavLink to={l.url} className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                    <ExternalLink className="h-3 w-3" />{l.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">{t("যোগাযোগ", "Contact")}</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0"><Phone className="h-4 w-4 text-cyan-400" /></div>
                <div><p className="text-slate-400 text-xs">{t("হেল্পলাইন", "Helpline")}</p><p className="text-white">{phone}</p></div>
              </li>
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0"><Mail className="h-4 w-4 text-cyan-400" /></div>
                <div><p className="text-slate-400 text-xs">{t("ইমেইল", "Email")}</p><p className="text-white">{email}</p></div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin className="h-4 w-4 text-cyan-400" /></div>
                <div><p className="text-slate-400 text-xs">{t("অফিস", "Office")}</p><p className="text-white">{address}</p></div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} {brandName}। {t("সর্বস্বত্ব সংরক্ষিত।", "All rights reserved.")}</p>
          <p className="text-sm text-slate-600">Powered by <span className="text-cyan-400 font-medium">ISP Desk ERP</span></p>
        </div>
      </div>
    </footer>
  );
}
