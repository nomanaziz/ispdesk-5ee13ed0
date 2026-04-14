import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ConfigCrudPage from "@/components/config/ConfigCrudPage";
import { toast } from "sonner";

export default function Districts() {
  const queryClient = useQueryClient();

  const handleStatusToggle = async (id: string, status: string) => {
    const { error } = await supabase.from("districts").update({ status }).eq("id", id);
    if (error) throw error;
    // Cascade: when district is deactivated, deactivate all its upazilas
    if (status === "inactive") {
      const { error: upError } = await supabase
        .from("upazilas")
        .update({ status: "inactive" })
        .eq("district_id", id);
      if (upError) throw upError;
      toast.info("সংশ্লিষ্ট সকল উপজেলাও নিষ্ক্রিয় করা হয়েছে");
    } else {
      const { error: upError } = await supabase
        .from("upazilas")
        .update({ status: "active" })
        .eq("district_id", id);
      if (upError) throw upError;
      toast.info("সংশ্লিষ্ট সকল উপজেলাও সক্রিয় করা হয়েছে");
    }
    queryClient.invalidateQueries({ queryKey: ["config-upazilas"] });
  };

  return (
    <ConfigCrudPage
      title="জেলা (District)"
      tableName="districts"
      queryKey="config-districts"
      fields={[
        { key: "name", label: "জেলার নাম", required: true, placeholder: "e.g. Dhaka" },
        { key: "code", label: "কোড", placeholder: "e.g. DHK" },
      ]}
      onStatusToggle={handleStatusToggle}
    />
  );
}
