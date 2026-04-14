import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ConfigCrudPage from "@/components/config/ConfigCrudPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Upazilas() {
  const [districtFilter, setDistrictFilter] = useState<string>("all");

  const { data: districts } = useQuery({
    queryKey: ["config-districts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("districts").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const districtOptions = (districts || []).map((d) => ({ value: d.id, label: d.name }));

  return (
    <ConfigCrudPage
      title="উপজেলা (Upazila)"
      tableName="upazilas"
      queryKey="config-upazilas"
      fields={[
        { key: "name", label: "উপজেলার নাম (বাংলা)", required: true },
        { key: "code", label: "ইংরেজি নাম" },
        { key: "district_id", label: "জেলা", type: "select", required: true, options: districtOptions, placeholder: "জেলা নির্বাচন করুন" },
      ]}
      extraColumns={[
        {
          key: "district_name",
          label: "জেলা",
          render: (row: any) => districts?.find((d) => d.id === row.district_id)?.name || "—",
        },
      ]}
      filterComponent={
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">জেলা ফিল্টার:</label>
          <Select value={districtFilter} onValueChange={setDistrictFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="সকল জেলা" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল জেলা</SelectItem>
              {districtOptions.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      filterFn={(row) => districtFilter === "all" || row.district_id === districtFilter}
      fetchQuery={async () => {
        const { data, error } = await supabase.from("upazilas").select("*").order("name");
        if (error) throw error;
        return data;
      }}
    />
  );
}
