import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Receipt, Printer } from "lucide-react";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function Payslip() {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const monthDate = `${month}-01`;

  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name), positions(name)").order("name");
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

  const { data: payrollEntry } = useQuery({
    queryKey: ["payslip", selectedEmployee, month],
    enabled: !!selectedEmployee,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", selectedEmployee)
        .eq("month", monthDate)
        .maybeSingle();
      return data;
    },
  });

  const emp = (employees || []).find((e: any) => e.id === selectedEmployee);
  const allowances = (payheads || []).filter((p: any) => p.type === "allowance");
  const deductions = (payheads || []).filter((p: any) => p.type === "deduction");
  const basic = payrollEntry?.basic_salary || 0;

  const calcAmount = (ph: any) => ph.is_percentage ? (basic * (ph.amount || 0) / 100) : (ph.amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পে-স্লিপ</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — বেতন স্লিপ</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-64"><SelectValue placeholder="কর্মী নির্বাচন করুন" /></SelectTrigger>
          <SelectContent>
            {(employees || []).map((e: any) => (
              <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
      </div>

      {selectedEmployee && payrollEntry ? (
        <Card className="max-w-2xl mx-auto print:shadow-none" id="payslip">
          <CardHeader className="text-center border-b">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <Receipt className="h-5 w-5" /> পে-স্লিপ
            </CardTitle>
            <p className="text-sm text-muted-foreground">{month}</p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">নাম:</span> <strong>{emp?.name}</strong></div>
              <div><span className="text-muted-foreground">কর্মী আইডি:</span> <strong>{emp?.employee_id}</strong></div>
              <div><span className="text-muted-foreground">ডিপার্টমেন্ট:</span> {emp?.departments?.name || "—"}</div>
              <div><span className="text-muted-foreground">পদবী:</span> {emp?.positions?.name || "—"}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-700 mb-2">আয় (Earnings)</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>মূল বেতন</span><span>৳{basic.toLocaleString()}</span></div>
                  {allowances.map((ph: any) => (
                    <div key={ph.id} className="flex justify-between">
                      <span>{ph.name} {ph.is_percentage ? `(${ph.amount}%)` : ""}</span>
                      <span>৳{calcAmount(ph).toLocaleString()}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>মোট আয়</span>
                    <span>৳{(basic + (payrollEntry.total_allowance || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-red-700 mb-2">কর্তন (Deductions)</h3>
                <div className="space-y-1 text-sm">
                  {deductions.map((ph: any) => (
                    <div key={ph.id} className="flex justify-between">
                      <span>{ph.name} {ph.is_percentage ? `(${ph.amount}%)` : ""}</span>
                      <span>৳{calcAmount(ph).toLocaleString()}</span>
                    </div>
                  ))}
                  {deductions.length === 0 && <p className="text-muted-foreground">কোনো কর্তন নেই</p>}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>মোট কর্তন</span>
                    <span>৳{(payrollEntry.total_deduction || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center text-lg font-bold bg-muted/50 p-3 rounded-lg">
              <span>নেট বেতন</span>
              <span className="text-primary">৳{(payrollEntry.net_salary || 0).toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>স্ট্যাটাস: <Badge variant={payrollEntry.status === "paid" ? "default" : "secondary"}>{payrollEntry.status === "paid" ? "পরিশোধিত" : "অপরিশোধিত"}</Badge></span>
              {payrollEntry.paid_at && <span>পরিশোধের তারিখ: {new Date(payrollEntry.paid_at).toLocaleDateString("bn-BD")}</span>}
            </div>

            <div className="flex justify-end print:hidden">
              <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> প্রিন্ট</Button>
            </div>
          </CardContent>
        </Card>
      ) : selectedEmployee ? (
        <Card className="max-w-2xl mx-auto"><CardContent className="p-8 text-center text-muted-foreground">এই মাসের পেরোল তথ্য পাওয়া যায়নি। প্রথমে পেরোল জেনারেট করুন।</CardContent></Card>
      ) : null}
    </div>
  );
}
