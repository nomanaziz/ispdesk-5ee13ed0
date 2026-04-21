import { supabase } from "@/integrations/supabase/client";

export type ImpersonateUserType = "client" | "reseller" | "reseller_sub" | "bw_customer";

export async function loginAsUser(user_type: ImpersonateUserType, user_id: string) {
  const { data, error } = await supabase.functions.invoke("impersonate-portal-user", {
    body: { user_type, user_id },
  });
  if (error) throw new Error(error.message || "Impersonation failed");
  if ((data as any)?.error) throw new Error((data as any).error);
  const { token, redirect } = data as { token: string; redirect: string };
  if (!token || !redirect) throw new Error("Invalid impersonation response");
  const url = `${window.location.origin}${redirect}#imp=${encodeURIComponent(token)}`;
  window.open(url, "_blank", "noopener");
}
