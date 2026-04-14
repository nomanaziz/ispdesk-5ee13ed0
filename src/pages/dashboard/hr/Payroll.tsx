import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { DollarSign, Calculator, CheckCircle } from "lucide-react";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const [month, setMonth] = useState(currentMonth);
  const queryClient = useQueryClient();
  const monthDate = `${month}-01`;

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name), positions(name)").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: payheads } = useQuery({
    queryKey: ["payheads-active"],
    queryFn: async () => {
      const { data } = await supabase.from("payheads").select("*").eq("status", "active");
      return data || [];
    },
  });

  const { data: payroll, isLoading } = useQuery({
    queryKey: ["payroll", month],
    queryFn: async () => {
      const { data } = await supabase.from("payroll").select("*").eq("month", monthDate);
      return data || [];
    },
  });

  const generatePayroll = useMutation({
    mutationFn: async () => {
      const allowances = (payheads || []).filter((p: any) => p.type === "allowance");
      const deductions = (payheads || []).filter((p: any) => p.type === "deduction");

      for (const emp of (employees || [])) {
        const existing = payroll?.find((p: any) => p.employee_id === emp.id);
        if (existing) continue;

        const basic = emp.salary || 0;
        let totalAllowance = 0;
        let totalDeduction = 0;

        for (const ph of allowances) {
          totalAllowance += ph.is_percentage ? (basic * (ph.amount || 0) / 100) : (ph.amount || 0);
        }
        for (const ph of deductions) {
          totalDeduction += ph.is_percentage ? (basic * (ph.amount || 0) / 100) : (ph.amount || 0);
        }

        const netSalary = basic + totalAllowance - totalDeduction;

        const { error } = await supabase.from("payroll").insert({
          employee_id: emp.id,
          month: monthDate,
          basic_salary: basic,
          total_allowance: totalAllowance,
          total_deduction: totalDeduction,
          net_salary: netSalary,
          status: "unpaid",
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", month] });
      toast.success("পেরোল জেনারেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "paid") updates.paid_at = new Date().toISOString();
      else updates.paid_at = null;
      const { error } = await supabase.from("payroll").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll", month] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const totalNet = (payroll || []).reduce((sum: number, p: any) => sum + (p.net_salary || 0), 0);
  const paidCount = (payroll || []).filter((p: any) => p.status === "paid").length;

  const getEmployee = (empId: string) => (employees || []).find((e: any) => e.id === empId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পেরোল</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — মাসিক বেতন প্রসেসিং</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          <Button onClick={() => generatePayroll.mutate()} disabled={generatePayroll.isPending} className="gap-2">
            <Calculator className="h-4 w-4" /> পেরোল জেনারেট
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">৳{totalNet.toLocaleString()}</p><p className="text-xs text-muted-foreground">মোট নেট বেতন</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{paidCount}</p><p className="text-xs text-muted-foreground">পরিশোধিত</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{(payroll || []).length - paidCount}</p><p className="text-xs text-muted-foreground">অপরিশোধিত</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5" /> পেরোল — {month} <Badge variant="secondary">{(payroll || []).length}</Badge></CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কর্মী</TableHead>
                    <TableHead>ডিপার্টমেন্ট</TableHead>
                    <TableHead className="text-right">মূল বেতন</TableHead>
                    <TableHead className="text-right">ভাতা</TableHead>
                    <TableHead className="text-right">কর্তন</TableHead>
                    <TableHead className="text-right">নেট বেতন</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>পরিশোধ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payroll || []).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">এই মাসের পেরোল এখনো জেনারেট হয়নি</TableCell></TableRow>
                  )}
                  {(payroll || []).map((p: any) => {
                    const emp = getEmployee(p.employee_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{emp?.name || "—"}</TableCell>
                        <TableCell>{emp?.departments?.name || "—"}</TableCell>
                        <TableCell className="text-right">৳{(p.basic_salary || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">+৳{(p.total_allowance || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">-৳{(p.total_deduction || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">৳{(p.net_salary || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                            {p.status === "paid" ? "পরিশোধিত" : "অপরিশোধিত"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={p.status === "paid"}
                            onCheckedChange={(checked) => togglePaid.mutate({ id: p.id, status: checked ? "paid" : "unpaid" })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
