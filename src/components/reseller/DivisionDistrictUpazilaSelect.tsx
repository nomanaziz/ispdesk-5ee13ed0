import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  divisionId?: string | null;
  districtId?: string | null;
  upazilaId?: string | null;
  onChange: (v: { division_id: string | null; district_id: string | null; upazila_id: string | null }) => void;
}

export default function DivisionDistrictUpazilaSelect({ divisionId, districtId, upazilaId, onChange }: Props) {
  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id,name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: districts = [] } = useQuery({
    queryKey: ["districts-by-div", divisionId],
    enabled: !!divisionId,
    queryFn: async () => {
      const { data, error } = await supabase.from("districts").select("id,name").eq("division_id", divisionId!).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: upazilas = [] } = useQuery({
    queryKey: ["upazilas-by-dist", districtId],
    enabled: !!districtId,
    queryFn: async () => {
      const { data, error } = await supabase.from("upazilas").select("id,name").eq("district_id", districtId!).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-clear children when parent cleared
  useEffect(() => {
    if (!divisionId && (districtId || upazilaId)) {
      onChange({ division_id: null, district_id: null, upazila_id: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [divisionId]);

  return (
    <>
      <div className="space-y-1.5">
        <Label>Division</Label>
        <Select
          value={divisionId || ""}
          onValueChange={(v) => onChange({ division_id: v || null, district_id: null, upazila_id: null })}
        >
          <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
          <SelectContent>
            {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>District</Label>
        <Select
          value={districtId || ""}
          onValueChange={(v) => onChange({ division_id: divisionId || null, district_id: v || null, upazila_id: null })}
          disabled={!divisionId}
        >
          <SelectTrigger><SelectValue placeholder={divisionId ? "Select district" : "Select division first"} /></SelectTrigger>
          <SelectContent>
            {districts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Upazila</Label>
        <Select
          value={upazilaId || ""}
          onValueChange={(v) => onChange({ division_id: divisionId || null, district_id: districtId || null, upazila_id: v || null })}
          disabled={!districtId}
        >
          <SelectTrigger><SelectValue placeholder={districtId ? "Select upazila" : "Select district first"} /></SelectTrigger>
          <SelectContent>
            {upazilas.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
