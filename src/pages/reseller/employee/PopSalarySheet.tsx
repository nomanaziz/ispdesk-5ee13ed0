import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const monthOptions = (() => {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = format(d, "yyyy-MM-01");
    const label = format(d, "MMM-yy");
    out.push({ value, label });
  }
  return out;
})();

export default function PopSalarySheet() {
  const qc = useQueryClient();
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM-01"));
  const [open, setOpen] = useState(false);

  const emptyForm = {
    employee_id: "",
    month: format(new Date(), "yyyy-MM-01"),
    paid_salary: "",
    overtime: "",
    incentive: "",
    bonus: "",
    advance: "",
    paid_date: format(new Date(), "yyyy-MM-dd"),
    remarks: "",
  };
  const [form, setForm] = useState<any>(emptyForm);

  const { data: employees = [] } = useQuery({
    queryKey: ["pop-emp-options", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees").select("id,name,salary").eq("branch_id", branchId!).eq("status", "active").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["pop-salary-sheet", branchId, filterMonth],
    enabled: !!branchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_sheets")
        .select("*, employees(name, salary)")
        .eq("branch_id", branchId!)
        .eq("month", filterMonth)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const totalAll = useMemo(() => rows.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0), [rows]);

  const selectedEmp = employees.find((e: any) => e.id === form.employee_id);
  const liveTotal = (Number(form.paid_salary || 0))
    + Number(form.overtime || 0)
    + Number(form.incentive || 0)
    + Number(form.bonus || 0)
    - Number(form.advance || 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch নেই");
      if (!form.employee_id) throw new Error("Employee নির্বাচন করুন");
      if (!form.month) throw new Error("Month নির্বাচন করুন");
      const paid = Number(form.paid_salary || 0);
      const overtime = Number(form.overtime || 0);
      const incentive = Number(form.incentive || 0);
      const bonus = Number(form.bonus || 0);
      const advance = Number(form.advance || 0);
      const total = paid + overtime + incentive + bonus - advance;
      const emp = employees.find((e: any) => e.id === form.employee_id);
      const basic = Number(emp?.salary || 0);
      const due = Math.max(0, basic - paid);

      const { error } = await supabase.from("salary_sheets").insert({
        branch_id: branchId,
        employee_id: form.employee_id,
        month: form.month,
        basic_salary: basic,
        paid_salary: paid,
        overtime, incentive, bonus, advance, due,
        total_amount: total,
        net_salary: total,
        paid_date: form.paid_date ? new Date(form.paid_date).toISOString() : null,
        remarks: form.remarks || null,
        status: "paid",
      } as any);
      if (error) throw error;

      // Auto-create accounting expense entry for the salary payment
      if (total > 0) {
        const monthLabel = format(new Date(form.month), "MMM-yy");
        const note = [
          `Salary — ${emp?.name || "Employee"} (${monthLabel})`,
          overtime > 0 ? `OT ৳${overtime}` : null,
          incentive > 0 ? `Incentive ৳${incentive}` : null,
          bonus > 0 ? `Bonus ৳${bonus}` : null,
          advance > 0 ? `Advance −৳${advance}` : null,
          form.remarks ? form.remarks : null,
        ].filter(Boolean).join(" • ");
        await supabase.from("expense_entries").insert({
          branch_id: branchId,
          expense_date: form.paid_date || format(new Date(), "yyyy-MM-dd"),
          category: "Salary",
          amount: total,
          payment_method: "cash",
          paid_by: emp?.name || null,
          reference: `SAL-${monthLabel}`,
          description: note,
        } as any);
      }
    },
    onSuccess: () => {
      toast.success("Salary saved & expense added");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["pop-salary-sheet"] });
      qc.invalidateQueries({ queryKey: ["pop-expense"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salary_sheets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!branchId) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">এই POP-এর জন্য branch assign করা নেই</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Salary Sheet</h1>
        <div className="flex items-center gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setForm({ ...emptyForm, month: filterMonth }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Pay Salary
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Month</th>
                <th className="p-3 text-right">Basic Salary</th>
                <th className="p-3 text-right">Paid Salary</th>
                <th className="p-3 text-right">Overtime</th>
                <th className="p-3 text-right">Incentive</th>
                <th className="p-3 text-right">Bonus</th>
                <th className="p-3 text-right">Advance</th>
                <th className="p-3 text-right">Due</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">কোনো record নেই</td></tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.employees?.name || "—"}</td>
                  <td className="p-3">{format(new Date(r.month), "MMM-yy")}</td>
                  <td className="p-3 text-right">{Number(r.basic_salary || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.paid_salary || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.overtime || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.incentive || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.bonus || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.advance || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.due || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-semibold">{Number(r.total_amount || 0).toFixed(2)}</td>
                  <td className="p-3">
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) remove.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-muted/30 font-bold">
                <tr>
                  <td colSpan={9} className="p-3 text-right">TOTAL</td>
                  <td className="p-3 text-right">{totalAll.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pay Salary</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Employee Name *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Month *</Label>
              <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Paid Salary *</Label>
              <Input type="number" value={form.paid_salary} onChange={(e) => setForm({ ...form, paid_salary: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Overtime</Label>
              <Input type="number" value={form.overtime} onChange={(e) => setForm({ ...form, overtime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Incentive</Label>
              <Input type="number" value={form.incentive} onChange={(e) => setForm({ ...form, incentive: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Bonus</Label>
              <Input type="number" value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Advance</Label>
              <Input type="number" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Paid Date *</Label>
              <Input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setForm(emptyForm)}>Clear</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
