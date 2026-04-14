import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export default function BranchPackages() {
  const { data: packages, isLoading } = useQuery({
    queryKey: ["isp-packages-reseller"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("isp_packages")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">প্যাকেজ তালিকা</h1>
        <p className="text-sm text-muted-foreground">
          রিসেলারদের জন্য উপলব্ধ ISP প্যাকেজসমূহ
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" /> সকল প্যাকেজ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>প্যাকেজের নাম</TableHead>
                    <TableHead>স্পিড</TableHead>
                    <TableHead>মূল্য (৳)</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages?.map((pkg, i) => (
                    <TableRow key={pkg.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.bandwidth_down ? `${pkg.bandwidth_down} Mbps` : "-"}</TableCell>
                      <TableCell className="font-mono">৳{pkg.price ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                          {pkg.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!packages || packages.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        কোনো প্যাকেজ পাওয়া যায়নি
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
