import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ConfigCrudPage from "@/components/config/ConfigCrudPage";
import { toast } from "sonner";

export default function Divisions() {
  const queryClient = useQueryClient();

  const handleStatusToggle = async (id: string, status: string) => {
    const { error } = await supabase.from("divisions").update({ status }).eq("id", id);
    if (error) throw error;

    // Get all districts under this division
    const { data: districts } = await supabase
      .from("districts")
      .select("id")
      .eq("division_id", id);

    if (districts && districts.length > 0) {
      const districtIds = districts.map((d) => d.id);
      // Cascade status to districts
      const { error: dErr } = await supabase
        .from("districts")
        .update({ status })
        .in("id", districtIds);
      if (dErr) throw dErr;

      // Cascade status to upazilas under those districts
      const { error: uErr } = await supabase
        .from("upazilas")
        .update({ status })
        .in("district_id", districtIds);
      if (uErr) throw uErr;

      toast.info(
        status === "inactive"
          ? "সংশ্লিষ্ট সকল জেলা ও উপজেলাও নিষ্ক্রিয় করা হয়েছে"
          : "সংশ্লিষ্ট সকল জেলা ও উপজেলাও সক্রিয় করা হয়েছে"
      );
    }

    queryClient.invalidateQueries({ queryKey: ["config-districts"] });
    queryClient.invalidateQueries({ queryKey: ["config-upazilas"] });
  };

  return (
    <ConfigCrudPage
      title="বিভাগ (Division)"
      tableName="divisions"
      queryKey="config-divisions"
      fields={[
        { key: "name", label: "বিভাগের নাম", required: true, placeholder: "e.g. ঢাকা" },
        { key: "code", label: "ইংরেজি নাম", placeholder: "e.g. Dhaka" },
      ]}
      onStatusToggle={handleStatusToggle}
      showStatusTabs
    />
  );
}
