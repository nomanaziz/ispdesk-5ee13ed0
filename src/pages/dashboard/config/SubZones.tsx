import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ConfigCrudPage from "@/components/config/ConfigCrudPage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePopScope } from "@/hooks/usePopScope";

export default function SubZones() {
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const { isPopMode, branchId } = usePopScope();

  const { data: zones } = useQuery({
    queryKey: ["config-zones-options", isPopMode && branchId ? branchId : "all"],
    queryFn: async () => {
      let q: any = supabase.from("zones").select("id, name").order("name");
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const zoneOptions = (zones || []).map((z) => ({ value: z.id, label: z.name }));

  return (
    <ConfigCrudPage
      title="সাব জোন (Sub Zone)"
      tableName="sub_zones"
      queryKey="config-sub-zones"
      fields={[
        { key: "name", label: "সাব জোনের নাম", required: true },
        { key: "code", label: "কোড" },
        { key: "zone_id", label: "জোন", type: "select", required: true, options: zoneOptions, placeholder: "জোন নির্বাচন করুন" },
        { key: "description", label: "বিবরণ" },
      ]}
      extraColumns={[
        {
          key: "zone_name",
          label: "জোন",
          render: (row: any) => zones?.find((z) => z.id === row.zone_id)?.name || "—",
        },
      ]}
      filterComponent={
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">জোন ফিল্টার:</label>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-64"><SelectValue placeholder="সকল জোন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সকল জোন</SelectItem>
              {zoneOptions.map((z) => <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
      filterFn={(row) => zoneFilter === "all" || row.zone_id === zoneFilter}
    />
  );
}
