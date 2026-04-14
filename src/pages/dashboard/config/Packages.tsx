import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Package, Search, Globe } from "lucide-react";

export default function Packages() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery({
    queryKey: ["isp-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("isp_packages")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const toggleHomepage = useMutation({
    mutationFn: async ({ id, show }: { id: string; show: boolean }) => {
      const { error } = await supabase
        .from("isp_packages")
        .update({ show_on_homepage: show })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isp-packages"] });
      toast.success("Package visibility updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const filtered = packages?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Packages</h1>
          <p className="text-sm text-muted-foreground">Manage ISP packages and website display</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> All Packages
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Price (৳)</TableHead>
                  <TableHead>Bandwidth</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Globe className="h-3.5 w-3.5" /> Homepage
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No packages found
                    </TableCell>
                  </TableRow>
                )}
                {filtered?.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell className="text-muted-foreground">{pkg.code || "—"}</TableCell>
                    <TableCell>{pkg.price.toLocaleString()}</TableCell>
                    <TableCell>
                      {pkg.bandwidth_down || 0} / {pkg.bandwidth_up || 0} Mbps
                    </TableCell>
                    <TableCell>{pkg.protocol || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.status === "active" ? "default" : "secondary"}>
                        {pkg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pkg.show_on_homepage ?? false}
                        onCheckedChange={(checked) =>
                          toggleHomepage.mutate({ id: pkg.id, show: checked })
                        }
                      />
                    </TableCell>
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
