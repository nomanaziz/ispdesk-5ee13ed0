import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setBranding, clearBranding } from "@/lib/portalBranding";
import { Loader2 } from "lucide-react";

interface Props { kind: "tenant" | "reseller"; }

/**
 * Branded portal entry: /t/:slug (tenant) or /r/:slug (reseller).
 * Looks up branding by slug, persists it, then redirects to /portal/login.
 */
const BrandedPortalEntry = ({ kind }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    if (!slug) { setStatus("notfound"); return; }
    (async () => {
      try {
        if (kind === "tenant") {
          const { data, error } = await supabase.rpc("get_tenant_branding_by_slug" as any, { _slug: slug });
          const row = Array.isArray(data) ? data[0] : null;
          if (error || !row) { setStatus("notfound"); return; }
          setBranding({
            kind: "tenant",
            slug,
            id: row.tenant_id,
            branchId: row.panel_branch_id,
            name: row.customer_name ?? slug,
            logoUrl: row.portal_logo_url,
            brandColor: row.portal_brand_color,
            title: row.portal_title,
          });
        } else {
          const { data, error } = await supabase.rpc("get_reseller_branding_by_slug" as any, { _slug: slug });
          const row = Array.isArray(data) ? data[0] : null;
          if (error || !row) { setStatus("notfound"); return; }
          setBranding({
            kind: "reseller",
            slug,
            id: row.reseller_id,
            branchId: row.branch_id,
            name: row.name ?? slug,
            logoUrl: row.portal_logo_url,
            brandColor: row.portal_brand_color,
            title: row.portal_title,
          });
        }
        setStatus("ok");
      } catch {
        clearBranding();
        setStatus("notfound");
      }
    })();
  }, [slug, kind]);

  if (status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (status === "notfound") {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Portal Not Found</h1>
          <p className="text-muted-foreground">
            "{slug}" নামে কোনো {kind === "tenant" ? "tenant" : "reseller"} portal নেই।
          </p>
        </div>
      </div>
    );
  }
  return <Navigate to="/portal/login" replace />;
};

export default BrandedPortalEntry;
