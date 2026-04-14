import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ConfigCrudPage from "@/components/config/ConfigCrudPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function Districts() {
  const queryClient = useQueryClient();
  const [divisionFilter, setDivisionFilter] = useState<string>("all");

  const { data: divisions } = useQuery({
    queryKey: ["config-divisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const divisionOptions = (divisions || []).map((d) => ({ value: d.id, label: d.name }));

  const handleStatusToggle = async (id: string, status: string) => {
    const { error } = await supabase.from("districts").update({ status }).eq("id", id);
    if (error) throw error;
    const newStatus = status === "inactive" ? "inactive" : "active";
    const { error: upError } = await supabase
      .from("upazilas")
      .update({ status: newStatus })
      .eq("district_id", id);
    if (upError) throw upError;
    toast.info(
      status === "inactive"
        ? "সংশ্লিষ্ট সকল উপজেলাও নিষ্ক্রিয় করা হয়েছে"
        : "সংশ্লিষ্ট সকল উপজেলাও সক্রিয় করা হয়েছে"
    );
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
        { key: "division_id", label: "বিভাগ", type: "select", required: true, options: divisionOptions, placeholder: "বিভাগ নির্বাচন করুন" },
      ]}
      extraColumns={[
        {
          key: "division_name",
          label: "বিভাগ",
          render: (row: any) => divisions?.find((d) => d.id === row.division_id)?.name || "—",
        },
      ]}
      filterComponent={
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">বিভাগ ফিল্টার:</label>
          <Select value={divisionFilter} onValueChange={setDivisionFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="সকল বিভাগ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল বিভাগ</SelectItem>
              {divisionOptions.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      filterFn={(row) => divisionFilter === "all" || row.division_id === divisionFilter}
      onStatusToggle={handleStatusToggle}
    />
  );
}
