import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export default function ProfileApprovals() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile-change-pending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_change_requests" as any)
        .select("*, employees(name, employee_id)")
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, accept, employee_id, changes }: any) => {
      if (accept) {
        const { error: upErr } = await supabase.from("employees").update(changes).eq("id", employee_id);
        if (upErr) throw upErr;
      }
      const { error } = await supabase.from("profile_change_requests" as any).update({
        status: accept ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("সম্পন্ন"); qc.invalidateQueries({ queryKey: ["profile-change-pending"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle>প্রোফাইল পরিবর্তনের অনুমোদন</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>তারিখ</TableHead><TableHead>কর্মী</TableHead><TableHead>পরিবর্তন</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="w-32"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("bn-BD")}</TableCell>
                <TableCell>{r.employees?.name} <span className="text-xs text-muted-foreground">({r.employees?.employee_id})</span></TableCell>
                <TableCell className="text-xs">
                  {Object.entries(r.changes || {}).map(([k, v]: any) => <div key={k}><b>{k}:</b> {String(v)}</div>)}
                </TableCell>
                <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                <TableCell>
                  {r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" onClick={() => decide.mutate({ id: r.id, accept: true, employee_id: r.employee_id, changes: r.changes })}><Check className="h-4 w-4 text-green-600" /></Button>
                      <Button size="icon" variant="outline" onClick={() => decide.mutate({ id: r.id, accept: false })}><X className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
