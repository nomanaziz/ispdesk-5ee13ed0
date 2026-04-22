import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePopScope } from "@/hooks/usePopScope";
import { Activity } from "lucide-react";

export default function PopActivityLog() {
  const { branchId } = usePopScope();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-activity-log", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      // Use billing_history scoped to this branch's clients
      const { data: clients } = await supabase
        .from("clients")
        .select("id")
        .eq("branch_id", branchId);
      const ids = (clients || []).map((c: any) => c.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("billing_history")
        .select("*")
        .in("client_id", ids)
        .order("changed_at", { ascending: false })
        .limit(200);
      return data || [];
    },
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">অ্যাক্টিভিটি লগ</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Activity (POP-scoped)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No activity yet</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.changed_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.remarks || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
