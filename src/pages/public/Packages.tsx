import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PACKAGE_TEMPLATES } from "./templates/registry";

export default function Packages() {
  const { data: tmpl } = useQuery({
    queryKey: ["active-template", "packages"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("website_templates")
        .select("template_key, config")
        .eq("page_key", "packages")
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const tmplKey = tmpl?.template_key && PACKAGE_TEMPLATES[tmpl.template_key] ? tmpl.template_key : "classic";
  const Active = PACKAGE_TEMPLATES[tmplKey].Component;
  return <Active config={tmpl?.config ?? {}} />;
}
