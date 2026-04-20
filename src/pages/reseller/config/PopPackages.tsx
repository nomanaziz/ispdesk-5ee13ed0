import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

export default function PopPackages() {
  const { customer } = usePortalAuth();
  const { popId } = getPopScope(customer);

  const { data, isLoading } = useQuery({
    queryKey: ["pop-tariff-packages", popId, customer?.tariff_id],
    enabled: !!customer?.tariff_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_tariff_packages")
        .select("*, isp_packages(name, bandwidth_down, package_type), mikrotik_devices(name)")
        .eq("tariff_id", (customer as any).tariff_id);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Package</h1>
        <p className="text-sm text-muted-foreground">আপনার tariff থেকে available packages (read-only)</p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Tariff Packages
            {data && <Badge variant="secondary">{data.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!customer?.tariff_id ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              এই POP-এ এখনো কোনো tariff assign করা হয়নি। Admin-এর সাথে যোগাযোগ করুন।
            </p>
          ) : isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Speed (Mbps)</TableHead>
                  <TableHead>MikroTik Profile</TableHead>
                  <TableHead>Server</TableHead>
                  <TableHead className="text-right">Rate (৳)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data || data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      কোনো package নেই
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.isp_packages?.name || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{p.isp_packages?.package_type || "—"}</Badge></TableCell>
                    <TableCell>{p.profile_speed || p.isp_packages?.bandwidth_down || "—"}</TableCell>
                    <TableCell>{p.mikrotik_profile || "—"}</TableCell>
                    <TableCell>{p.mikrotik_devices?.name || "—"}</TableCell>
                    <TableCell className="text-right font-mono">৳ {Number(p.package_rate || 0).toLocaleString()}</TableCell>
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
