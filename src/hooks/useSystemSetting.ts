import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSystemSetting<T = Record<string, any>>(settingKey: string, defaultValue: T) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["system-settings", settingKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("setting_key", settingKey)
        .single();
      return data;
    },
  });

  const value: T = (query.data?.setting_value as T) ?? defaultValue;

  const mutation = useMutation({
    mutationFn: async (newValue: T) => {
      if (query.data) {
        const { error } = await supabase
          .from("system_settings")
          .update({ setting_value: newValue as any })
          .eq("setting_key", settingKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("system_settings")
          .insert({ setting_key: settingKey, setting_value: newValue as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings", settingKey] });
      toast.success("সেটিংস সংরক্ষিত হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { value, isLoading: query.isLoading, save: mutation.mutate, isSaving: mutation.isPending };
}
