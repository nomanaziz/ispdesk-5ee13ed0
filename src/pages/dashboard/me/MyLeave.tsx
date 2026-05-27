import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function MyLeave() {
  const { employee } = useEmployeeContext();
  const { data: balances } = useQuery({
    queryKey: ["my-leave-bal", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances" as any).select("*, leave_types(name)").eq("employee_id", employee!.id);
      return (data as any[]) ?? [];
    },
  });
  const { data: applications } = useQuery({
    queryKey: ["my-leave-apps", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_applications" as any).select("*, leave_types(name)").eq("employee_id", employee!.id).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });
  if (!employee) return null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>আমার ছুটির ব্যালেন্স</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(balances ?? []).map((b: any) => (
            <Card key={b.id}><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{b.leave_types?.name || "—"}</p>
              <p className="text-xl font-bold">{Number(b.balance || 0)} দিন</p>
            </CardContent></Card>
          ))}
          {(balances ?? []).length === 0 && <p className="text-muted-foreground text-sm col-span-full">ব্যালেন্স সেট করা নেই</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">আমার আবেদনসমূহ</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ধরন</TableHead><TableHead>শুরু</TableHead><TableHead>শেষ</TableHead><TableHead>দিন</TableHead><TableHead>স্ট্যাটাস</TableHead></TableRow></TableHeader>
            <TableBody>
              {(applications ?? []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.leave_types?.name}</TableCell>
                  <TableCell className="text-xs">{a.start_date}</TableCell>
                  <TableCell className="text-xs">{a.end_date}</TableCell>
                  <TableCell>{a.days}</TableCell>
                  <TableCell><Badge variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "outline"}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(applications ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো আবেদন নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
