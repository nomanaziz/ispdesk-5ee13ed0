import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Check, X, Eye } from "lucide-react";

const ServiceRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-all-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("service_requests").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("service_requests").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-requests"] });
      toast({ title: "Status updated" });
    },
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-amber-100 text-amber-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Service Requests</h1>
          <p className="text-sm text-muted-foreground">Manage incoming ISP service requests</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ISP Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.isp_name}</TableCell>
                  <TableCell>{r.contact_name}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{r.district}</TableCell>
                  <TableCell>{r.service_needed}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor(r.status || 'pending')}`}>
                      {r.status || "pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600"
                            onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "Loading..." : "No service requests yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceRequests;
