import { useQuery } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Info } from "lucide-react";

interface Props { mode: "district" | "upazila" }

export default function PopAllotedAreas({ mode }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["pop-allotted-areas", mode],
    queryFn: async () => {
      const res = await callPortal<{ rows: any[] }>("get_pop_allotted_areas", { mode });
      return res.rows || [];
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
