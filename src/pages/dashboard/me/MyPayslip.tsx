import { useState } from "react";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Printer } from "lucide-react";
import { periodLabel } from "@/lib/payrollCompute";

export default function MyPayslip() {
  const { employee } = useEmployeeContext();
  const [openSlip, setOpenSlip] = useState<any | null>(null);

  const { data } = useQuery({
    queryKey: ["my-payslips", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll").select("*").eq("employee_id", employee!.id).order("month", { ascending: false });
      return data ?? [];
    },
  });

  const { data: details } = useQuery({
    queryKey: ["my-payslip-detail", openSlip?.id],
    enabled: !!openSlip?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_details" as any)
        .select("amount, payheads(name, type)")
        .eq("payroll_id", openSlip!.id);
      return (data as any[]) ?? [];
    },
  });

  if (!employee) return null;

  const allowances = (details ?? []).filter((d: any) => d.payheads?.type === "allowance");
  const deductions = (details ?? []).filter((d: any) => d.payheads?.type === "deduction");

  return (
    <>
      <Card>
        <CardHeader><CardTitle>আমার পে-স্লিপ</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>পিরিয়ড</TableHead><TableHead className="text-right">নেট</TableHead>
              <TableHead className="text-right">পরিশোধিত</TableHead><TableHead className="text-right">বকেয়া</TableHead>
              <TableHead>স্ট্যাটাস</TableHead><TableHead className="w-24"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((p: any) => {
                const net = Number(p.net_salary || 0);
                const paid = Number(p.paid_amount || 0);
                const due = Math.max(0, net - paid);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.period_label || periodLabel(p.month)}</TableCell>
                    <TableCell className="text-right">৳{net.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-700">৳{paid.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">৳{due.toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === "paid" ? "default" : "outline"}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setOpenSlip(p)} className="gap-1">
                        <Eye className="h-3 w-3" /> দেখুন
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">কোনো পে-স্লিপ নেই</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!openSlip} onOpenChange={(o) => !o && setOpenSlip(null)}>
        <DialogContent className="max-w-2xl print:shadow-none">
          <DialogHeader>
            <DialogTitle>
              পে-স্লিপ — {openSlip ? (openSlip.period_label || periodLabel(openSlip.month)) : ""}
            </DialogTitle>
          </DialogHeader>
          {openSlip && (
            <div className="space-y-4 text-sm" id="payslip-print">
              <div className="grid grid-cols-2 gap-3 border-b pb-3">
                <div>
                  <p className="text-muted-foreground text-xs">কর্মী</p>
                  <p className="font-semibold">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">{employee.employee_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">তৈরি</p>
                  <p>{new Date(openSlip.generated_at || openSlip.created_at).toLocaleDateString("bn-BD")}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold mb-2">আয়</p>
                <div className="space-y-1">
                  <Row label="মূল বেতন" value={Number(openSlip.basic_salary || 0)} />
                  {allowances.map((a: any, i: number) => (
                    <Row key={i} label={a.payheads?.name || "ভাতা"} value={Number(a.amount || 0)} />
                  ))}
                  <Row label="মোট ভাতা" value={Number(openSlip.total_allowance || 0)} bold />
                </div>
              </div>

              <div>
                <p className="font-semibold mb-2">কর্তন</p>
                <div className="space-y-1">
                  {deductions.map((d: any, i: number) => (
                    <Row key={i} label={d.payheads?.name || "কর্তন"} value={Number(d.amount || 0)} />
                  ))}
                  {Number(openSlip.advance_deduction || 0) > 0 && (
                    <Row label="অগ্রিম বেতন কর্তন" value={Number(openSlip.advance_deduction)} />
                  )}
                  {Number(openSlip.loan_deduction || 0) > 0 && (
                    <Row label="ঋণ কর্তন" value={Number(openSlip.loan_deduction)} />
                  )}
                  <Row label="মোট কর্তন" value={Number(openSlip.total_deduction || 0)} bold />
                </div>
              </div>

              <div className="border-t pt-3 space-y-1">
                <Row label="নেট বেতন" value={Number(openSlip.net_salary || 0)} bold size="lg" />
                <Row label="পরিশোধিত" value={Number(openSlip.paid_amount || 0)} color="text-green-700" />
                <Row label="বকেয়া" value={Math.max(0, Number(openSlip.net_salary || 0) - Number(openSlip.paid_amount || 0))} color="text-destructive" />
              </div>

              <div className="flex justify-end gap-2 pt-2 print:hidden">
                <Button variant="outline" onClick={() => window.print()} className="gap-1">
                  <Printer className="h-4 w-4" /> প্রিন্ট / PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value, bold, size, color }: { label: string; value: number; bold?: boolean; size?: "lg"; color?: string }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${size === "lg" ? "text-base" : ""}`}>
      <span>{label}</span>
      <span className={color || ""}>৳{value.toLocaleString()}</span>
    </div>
  );
}
