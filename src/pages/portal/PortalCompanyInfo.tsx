import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Phone, Mail, Globe, CreditCard } from "lucide-react";

const PortalCompanyInfo = () => {
  const { data: settings } = useQuery({
    queryKey: ["portal-company-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const s: any = settings || {};

  const infoBlocks = [
    { icon: MapPin, label: "Address", value: s.company_address || s.address || "—", tint: "from-rose-500 to-pink-500" },
    { icon: Phone, label: "Hotline", value: s.hotline || s.phone || s.contact || "—", tint: "from-emerald-500 to-teal-500" },
    { icon: Mail, label: "Email", value: s.email || "—", tint: "from-sky-500 to-cyan-500" },
    { icon: Globe, label: "Website", value: s.website || "—", tint: "from-violet-500 to-indigo-500" },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Company Information</h1>
          <p className="text-sm text-muted-foreground">About your service provider</p>
        </div>
      </div>

      {/* Hero */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-6 sm:p-8 text-center">
          {s.logo_url && (
            <img src={s.logo_url} alt="logo" className="h-16 mx-auto mb-3 bg-white/10 rounded-xl p-2" />
          )}
          <h2 className="text-2xl font-bold">{s.company_name || s.site_name || "Your ISP"}</h2>
          {s.tagline && <p className="text-white/80 mt-1 text-sm">{s.tagline}</p>}
        </div>
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {infoBlocks.map((b) => (
          <Card key={b.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${b.tint} flex items-center justify-center text-white shadow shrink-0`}>
                <b.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{b.label}</div>
                <div className="font-medium text-sm break-words">{b.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment instructions */}
      {s.payment_instructions && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold">Payment Instructions</h3>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.payment_instructions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PortalCompanyInfo;
