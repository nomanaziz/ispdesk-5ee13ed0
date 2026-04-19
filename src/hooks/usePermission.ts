import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Checks whether the current user has a specific device-scoped permission.
 * Wraps the SECURITY DEFINER `has_device_permission` RPC.
 */
export function usePermission(key: string, deviceId?: string | null, branchId?: string | null) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["device-permission", user?.id, key, deviceId, branchId],
    enabled: !!user?.id && !!key,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_device_permission", {
        _user_id: user!.id,
        _key: key,
        _device_id: deviceId ?? null,
        _branch_id: branchId ?? null,
      });
      if (error) return false;
      return data === true;
    },
  });
  return { allowed: !!data, loading: isLoading };
}
