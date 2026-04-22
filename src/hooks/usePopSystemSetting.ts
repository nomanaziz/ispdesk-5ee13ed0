import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePopScope } from "./usePopScope";

/**
 * Per-POP system setting hook.
 * Stores under key: `pop:{branch_id}:{settingKey}`.
 * Falls back to defaultValue when row is missing.
 */
export function usePopSystemSetting<T = Record<string, any>>(
  settingKey: string,
  defaultValue: T,
) {
  const { branchId } = usePopScope();
  const queryClient = useQueryClient();
  const fullKey = branchId ? `pop:${branchId}:${settingKey}` : `pop:_:${settingKey}`;

  const query = useQuery({
    queryKey: ["pop-system-settings", fullKey],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_key", fullKey)
        .maybeSingle();
      return data;
    },
  });

  const value: T = (query.data?.setting_value as T) ?? defaultValue;

  const mutation = useMutation({
    mutationFn: async (newValue: T) => {
      if (!branchId) throw new Error("POP branch_id missing");
      if (query.data) {
        const { error } = await supabase
          .from("system_settings")
          .update({ setting_value: newValue as any })
          .eq("setting_key", fullKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ setting_key: fullKey, setting_value: newValue as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pop-system-settings", fullKey] });
      toast.success("সেটিংস সংরক্ষিত হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    value,
    isLoading: query.isLoading,
    save: mutation.mutate,
    isSaving: mutation.isPending,
    branchId,
  };
}
