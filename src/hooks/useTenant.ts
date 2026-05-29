import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: string | null | undefined = undefined;

/**
 * Single-tenant ERP install: derive tenant_id from any branch row.
 * Cached for the session.
 */
export function useTenant() {
  const [tenantId, setTenantId] = useState<string | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (cached !== undefined) return;
    (async () => {
      const { data } = await supabase.from("branches").select("tenant_id").limit(1).maybeSingle();
      cached = (data?.tenant_id as string | null) ?? null;
      setTenantId(cached);
      setLoading(false);
    })();
  }, []);

  return { tenantId, loading };
}
