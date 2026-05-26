import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function EmployeeLoans() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    loan_amount: 0,
    installments: 3,
    start_month: new Date().toISOString().slice(0, 7),
    reason: "",
  });

  const monthlyInst = form.installments > 0 ? Math.round((form.loan_amount / form.installments) * 100) / 100 : 0;

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => (await supabase.from("employees").select("id, name, employee_id, salary").order("name")).data || [],
  });

  const { data: loans, refetch } = useQuery({
    queryKey: ["employee-loans"],
    queryFn: async () => (await supabase.from("employee_loans").select("*, employees(name, employee_id)").order("created_at", { ascending: false })).data || [],
  });

  const save = async () => {
    if (!form.employee_id || form.loan_amount <= 0 || form.installments <= 0) return toast.error("সব ফিল্ড পূরণ করুন");
    const { error } = await supabase.from("employee_loans").insert({
      employee_id: form.employee_id,
      loan_amount: form.loan_amount,
      installments: form.installments,
      monthly_installment: monthlyInst,
      start_month: form.start_month,
      remaining_balance: form.loan_amount,
      reason: form.reason,
      status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Loan তৈরি হলো");
    setOpen(false);
    setForm({ employee_id: "", loan_amount: 0, installments: 3, start_month: new Date().toISOString().slice(0, 7), reason: "" });
    refetch();
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel?")) return;
    await supabase.from("employee_loans").update({ status: "cancelled" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["employee-loans"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">কর্মী Loan</h1>
          <p className="text-sm text-muted-foreground">Loan installment প্রতি মাসের পে-স্লিপ থেকে auto-deduct হবে</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> নতুন Loan</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>সব Loan</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>কর্মী</TableHead>
                <TableHead className="text-right">মোট</TableHead>
                <TableHead>কিস্তি</TableHead>
                <TableHead className="text-right">প্রতি মাসে</TableHead>
                <TableHead>শুরু</TableHead>
                <TableHead>অগ্রগতি</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loans || []).map((l: any) => {
                const paid = Number(l.loan_amount) - Number(l.remaining_balance);
                const pct = l.loan_amount > 0 ? Math.round((paid / Number(l.loan_amount)) * 100) : 0;
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.employees?.name}</div>
                      <div className="text-xs text-muted-foreground">{l.employees?.employee_id}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold">৳{Number(l.loan_amount).toLocaleString()}</TableCell>
                    <TableCell>{l.installments} মাস</TableCell>
                    <TableCell className="text-right">৳{Number(l.monthly_installment).toLocaleString()}</TableCell>
                    <TableCell>{l.start_month}</TableCell>
                    <TableCell className="min-w-[160px]">
                      <Progress value={pct} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">৳{paid.toLocaleString()} / ৳{Number(l.loan_amount).toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.status === "active" ? "default" : l.status === "completed" ? "secondary" : "destructive"}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {l.status === "active" && (
                        <Button size="sm" variant="ghost" onClick={() => cancel(l.id)} className="text-destructive">Cancel</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(loans || []).length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো loan নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন Loan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>কর্মী *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="কর্মী নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {(employees || []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} — বেতন ৳{Number(e.salary || 0).toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Loan পরিমাণ (৳) *</Label>
                <Input type="number" value={form.loan_amount} onChange={(e) => setForm({ ...form, loan_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>কত মাসে শোধ *</Label>
                <Input type="number" min={1} max={36} value={form.installments} onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })} />
              </div>
              <div>
                <Label>শুরুর মাস</Label>
                <Input type="month" value={form.start_month} onChange={(e) => setForm({ ...form, start_month: e.target.value })} />
              </div>
              <div>
                <Label>প্রতি মাসে কাটা যাবে</Label>
                <Input value={`৳${monthlyInst.toLocaleString()}`} readOnly className="bg-muted font-bold" />
              </div>
            </div>
            <div>
              <Label>কারণ</Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={save}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
