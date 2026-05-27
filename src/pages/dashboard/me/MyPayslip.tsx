import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { periodLabel } from "@/lib/payrollCompute";

export default function MyPayslip() {
  const { employee } = useEmployeeContext();
  const { data } = useQuery({
    queryKey: ["my-payslips", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll").select("*").eq("employee_id", employee!.id).order("month", { ascending: false });
      return data ?? [];
    },
  });
  if (!employee) return null;
  return (
    <Card>
      <CardHeader><CardTitle>আমার পে-স্লিপ</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>পিরিয়ড</TableHead><TableHead className="text-right">নেট</TableHead>
            <TableHead className="text-right">পরিশোধিত</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead className="w-24"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(data ?? []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>{p.period_label || periodLabel(p.month)}</TableCell>
                <TableCell className="text-right">৳{Number(p.net_salary || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">৳{Number(p.paid_amount || 0).toLocaleString()}</TableCell>
                <TableCell><Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">কোনো পে-স্লিপ নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
