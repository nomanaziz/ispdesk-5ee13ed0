import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyInfo {
  name?: string;
  logo_url?: string;
  tagline?: string;
  [k: string]: any;
}

/**
 * Reads the tenant's company info (saved at /dashboard/system/company)
 * so any surface — sidebar, navbar, footer, login — can show the
 * uploaded company logo and fall back to the default ISP Desk logo.
 */
export function useCompanyInfo() {
  return useQuery<CompanyInfo | null>({
    queryKey: ["company-info"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "company_info")
        .maybeSingle();
      return (data?.setting_value as CompanyInfo) || null;
    },
    staleTime: 60_000,
  });
}
