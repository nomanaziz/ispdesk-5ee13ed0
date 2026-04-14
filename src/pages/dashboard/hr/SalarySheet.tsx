import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download } from "lucide-react";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function SalarySheet() {
  const [month, setMonth] = useState(currentMonth);
  const monthDate = `${month}-01`;

  const { data: payroll, isLoading } = useQuery({
    queryKey: ["payroll-sheet", month],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll")
        .select("*, employees(employee_id, name, departments(name), positions(name))")
        .eq("month", monthDate)
        .order("created_at");
      return data || [];
    },
  });

  const totalBasic = (payroll || []).reduce((s: number, p: any) => s + (p.basic_salary || 0), 0);
  const totalAllowance = (payroll || []).reduce((s: number, p: any) => s + (p.total_allowance || 0), 0);
  const totalDeduction = (payroll || []).reduce((s: number, p: any) => s + (p.total_deduction || 0), 0);
  const totalNet = (payroll || []).reduce((s: number, p: any) => s + (p.net_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">বেতন শীট</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — মাসিক বেতন সারাংশ</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> বেতন শীট — {month}
            <Badge variant="secondary" className="ml-2">{(payroll || []).length} জন</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ক্র.নং</TableHead>
                    <TableHead>কর্মী আইডি</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>ডিপার্টমেন্ট</TableHead>
                    <TableHead>পদবী</TableHead>
                    <TableHead className="text-right">মূল বেতন</TableHead>
                    <TableHead className="text-right">ভাতা</TableHead>
                    <TableHead className="text-right">কর্তন</TableHead>
                    <TableHead className="text-right">নেট বেতন</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payroll || []).length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">এই মাসের কোনো বেতন তথ্য নেই</TableCell></TableRow>
                  )}
                  {(payroll || []).map((p: any, i: number) => (
                    <TableRow key={p.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono">{p.employees?.employee_id || "—"}</TableCell>
                      <TableCell className="font-medium">{p.employees?.name || "—"}</TableCell>
                      <TableCell>{p.employees?.departments?.name || "—"}</TableCell>
                      <TableCell>{p.employees?.positions?.name || "—"}</TableCell>
                      <TableCell className="text-right">৳{(p.basic_salary || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">৳{(p.total_allowance || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">৳{(p.total_deduction || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold">৳{(p.net_salary || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                          {p.status === "paid" ? "পরিশোধিত" : "অপরিশোধিত"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(payroll || []).length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={5} className="text-right">মোট:</TableCell>
                      <TableCell className="text-right">৳{totalBasic.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">৳{totalAllowance.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">৳{totalDeduction.toLocaleString()}</TableCell>
                      <TableCell className="text-right">৳{totalNet.toLocaleString()}</TableCell>
                      <TableCell />
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
