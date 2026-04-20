import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Info } from "lucide-react";

export default function PopPackages() {
  const { customer } = usePortalAuth();
  const tariffId = (customer as any)?.tariff_id;

  const { data, isLoading } = useQuery({
    queryKey: ["pop-tariff-packages", tariffId],
    enabled: !!tariffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_tariff_packages")
        .select(`
          id, buy_rate, selling_rate, mikrotik_profile, protocol_type,
          validity_days, min_activation_days, profile_speed, package_rate,
          isp_packages(name, bandwidth_down, package_type),
          mikrotik_devices(name)
        `)
        .eq("tariff_id", tariffId);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Package</h1>
        <p className="text-sm text-muted-foreground">
          Admin আপনার tariff-এ যে package গুলো assign করেছে — buying rate, selling rate সহ
        </p>
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            Read-only view। নতুন package, rate পরিবর্তন বা MikroTik profile change করতে admin-এর সাথে যোগাযোগ করুন।
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Tariff Packages
            {data && <Badge variant="secondary">{data.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tariffId ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              এই POP-এ এখনো কোনো tariff assign করা হয়নি। Admin-এর সাথে যোগাযোগ করুন।
            </p>
          ) : isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead className="text-right">Buy Rate (৳)</TableHead>
                    <TableHead className="text-right">Sell Rate (৳)</TableHead>
                    <TableHead className="text-center">Validity</TableHead>
                    <TableHead className="text-center">Min R.Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!data || data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        কোনো package নেই
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.isp_packages?.name || "—"}</TableCell>
                      <TableCell>{p.mikrotik_devices?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.protocol_type || "—"}</Badge>
                      </TableCell>
                      <TableCell>{p.mikrotik_profile || "—"}</TableCell>
                      <TableCell className="text-right font-mono">
                        ৳ {Number(p.buy_rate || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">
                        ৳ {Number(p.selling_rate || p.package_rate || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">{p.validity_days || 30}</TableCell>
                      <TableCell className="text-center">{p.min_activation_days || 1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
