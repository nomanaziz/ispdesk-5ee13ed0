import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight } from "lucide-react";

export default function AssignedAreasWidget() {
  const { customer } = usePortalAuth();
  const popId = customer?.type === "reseller_sub"
    ? (customer as any)?.parent_reseller_id
    : (customer as any)?.sub;
  const popDistrictId = (customer as any)?.district_id;

  const { data, isLoading } = useQuery({
    queryKey: ["pop-assigned-widget", popId],
    enabled: !!popId,
    queryFn: async () => {
      const { data: assignments } = await supabase
        .from("pop_district_assignments")
        .select("district_id, upazila_ids, districts(name)")
        .eq("branch_manager_id", popId!);
      let rows = (assignments || []).map((a: any) => ({
        name: a.districts?.name || "—",
        upazilas: (a.upazila_ids || []).length,
      }));
      if (rows.length === 0 && popDistrictId) {
        const { data: d } = await supabase.from("districts").select("name").eq("id", popDistrictId).maybeSingle();
        if (d) rows = [{ name: d.name, upazilas: 0 }];
      }
      return rows;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Assigned Areas
          </span>
          {data && <Badge variant="secondary">{data.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Admin আপনার জন্য কোনো এরিয়া assign করেননি। Admin-কে যোগাযোগ করুন।
          </p>
        ) : (
          <ul className="space-y-1.5">
            {data.slice(0, 3).map((d, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.upazilas} upazilas</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/pop-admin/config/districts"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
