import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Info } from "lucide-react";

interface Props { mode: "district" | "upazila" }

export default function PopAllotedAreas({ mode }: Props) {
  const { customer } = usePortalAuth();
  const popId = customer?.type === "reseller_sub"
    ? (customer as any)?.parent_reseller_id
    : (customer as any)?.sub;
  const popDistrictId = (customer as any)?.district_id;
  const popUpazilaId = (customer as any)?.upazila_id;

  const { data, isLoading } = useQuery({
    queryKey: ["pop-allotted", popId, mode, popDistrictId, popUpazilaId],
    enabled: !!popId,
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from("pop_district_assignments")
        .select("district_id, upazila_ids, districts(id, name, code)")
        .eq("branch_manager_id", popId!);
      if (error) throw error;

      // ---- DISTRICT MODE ----
      if (mode === "district") {
        const rows = (assignments || []).map((a: any) => ({
          id: a.district_id,
          name: a.districts?.name || "—",
          code: a.districts?.code || "—",
          upazilaCount: (a.upazila_ids || []).length,
          isDefault: false,
        }));

        // Fallback: if no allotment exists, show POP profile's own district
        if (rows.length === 0 && popDistrictId) {
          const { data: d } = await supabase
            .from("districts")
            .select("id, name, code")
            .eq("id", popDistrictId)
            .maybeSingle();
          if (d) {
            return [{
              id: d.id,
              name: d.name,
              code: d.code || "—",
              upazilaCount: popUpazilaId ? 1 : 0,
              isDefault: true,
            }];
          }
        }
        return rows;
      }

      // ---- UPAZILA MODE ----
      const allUpazilaIds = (assignments || []).flatMap((a: any) => a.upazila_ids || []);
      if (allUpazilaIds.length > 0) {
        const { data: upazilas } = await supabase
          .from("upazilas")
          .select("id, name, districts(name)")
          .in("id", allUpazilaIds);
        return (upazilas || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          districtName: u.districts?.name || "—",
          isDefault: false,
        }));
      }

      // Fallback: POP profile's own upazila
      if (popUpazilaId) {
        const { data: u } = await supabase
          .from("upazilas")
          .select("id, name, districts(name)")
          .eq("id", popUpazilaId)
          .maybeSingle();
        if (u) {
          return [{
            id: u.id,
            name: u.name,
            districtName: (u as any).districts?.name || "—",
            isDefault: true,
          }];
        }
      }
      return [];
    },
  });

  const title = mode === "district" ? "District" : "Upazila";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">Admin allotted {title.toLowerCase()}s (read-only)</p>
      </div>
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            এই {title.toLowerCase()}গুলো admin আপনার POP-কে assign করেছে। নতুন এলাকা যোগ করতে admin-এর সাথে যোগাযোগ করুন।
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Allotted {title}s
            {data && <Badge variant="secondary">{data.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {mode === "district" ? (
                    <>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Allotted Upazilas</TableHead>
                    </>
                  ) : (
                    <TableHead>District</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data || data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                      কোনো {title.toLowerCase()} assign করা হয়নি
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.isDefault && (
                        <Badge variant="outline" className="ml-2 text-[10px]">Default — POP profile থেকে</Badge>
                      )}
                    </TableCell>
                    {mode === "district" ? (
                      <>
                        <TableCell>{row.code}</TableCell>
                        <TableCell className="text-right">{row.upazilaCount || "All"}</TableCell>
                      </>
                    ) : (
                      <TableCell>{row.districtName}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
