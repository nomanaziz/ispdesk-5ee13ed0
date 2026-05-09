import { supabase } from "@/integrations/supabase/client";

export type ImpersonateUserType = "client" | "reseller" | "reseller_sub" | "bw_customer";

async function getPortalBaseUrl(): Promise<string> {
  try {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "portal_base_url")
      .maybeSingle();
    const url = (data?.setting_value as any)?.url as string | undefined;
    if (url && /^https?:\/\//i.test(url)) {
      return url.replace(/\/+$/, "");
    }
  } catch {
    // ignore — fall back to current origin
  }
  return window.location.origin;
}

export async function loginAsUser(user_type: ImpersonateUserType, user_id: string) {
  const { data, error } = await supabase.functions.invoke("impersonate-portal-user", {
    body: { user_type, user_id },
  });
  if (error) throw new Error(error.message || "Impersonation failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  const { token, redirect } = data as { token: string; redirect: string };
  if (!token || !redirect) throw new Error("Invalid impersonation response");
  const base = await getPortalBaseUrl();
  const url = `${base}${redirect}#imp=${encodeURIComponent(token)}`;
  window.open(url, "_blank", "noopener");
}
