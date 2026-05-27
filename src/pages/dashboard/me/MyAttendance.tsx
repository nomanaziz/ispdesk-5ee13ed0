import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MyAttendance() {
  const { employee } = useEmployeeContext();
  const { data } = useQuery({
    queryKey: ["my-attendance-list", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance" as any).select("*").eq("employee_id", employee!.id).order("date", { ascending: false }).limit(60);
      return (data as any[]) ?? [];
    },
  });
  if (!employee) return null;
  return (
    <Card>
      <CardHeader><CardTitle>আমার হাজিরা (শেষ ৬০ দিন)</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>তারিখ</TableHead><TableHead>প্রবেশ</TableHead><TableHead>প্রস্থান</TableHead><TableHead>স্ট্যাটাস</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell className="text-xs">{r.in_time || "—"}</TableCell>
                <TableCell className="text-xs">{r.out_time || "—"}</TableCell>
                <TableCell><Badge variant={r.status === "present" ? "default" : r.status === "absent" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">কোনো record নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
