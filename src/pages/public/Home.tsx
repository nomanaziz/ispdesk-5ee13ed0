import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HOME_TEMPLATES } from "./templates/registry";

export default function Home() {
  const { data: tmpl } = useQuery({
    queryKey: ["active-template", "home"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("website_templates")
        .select("template_key, config")
        .eq("page_key", "home")
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const tmplKey = tmpl?.template_key && HOME_TEMPLATES[tmpl.template_key] ? tmpl.template_key : "classic";
  const Active = HOME_TEMPLATES[tmplKey].Component;
  return <Active config={tmpl?.config ?? {}} />;
}
