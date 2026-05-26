import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";
import { generatePeriods, PERIOD_TYPES, PAYMENT_TYPES, type PeriodType } from "@/lib/payrollPeriods";

const PAYROLL_TYPES: PeriodType[] = PERIOD_TYPES;

export default function Payroll() {
  const qc = useQueryClient();

  // ---- list ----
  const { data: payrolls, isLoading } = useQuery({
    queryKey: ["payrolls"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_templates")
        .select("*")
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  const { data: payheads } = useQuery({
    queryKey: ["payheads-active"],
    queryFn: async () => {
      const { data } = await supabase.from("payheads").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  // ---- add/edit payroll ----
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", payroll_type: "Monthly", payment_type: "" });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", payroll_type: "Monthly", payment_type: "" });
    setFormOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      payroll_type: row.payroll_type || "Monthly",
      payment_type: row.payment_type || "",
    });
    setFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("PayRoll Name আবশ্যক");
      const payload: any = {
        name: form.name.trim(),
        payroll_type: form.payroll_type,
        payment_type: form.payment_type || null,
        status: "active",
      };
      if (editing) {
        const { error } = await supabase.from("payroll_templates").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("সংরক্ষিত হয়েছে");
      setFormOpen(false);
      qc.invalidateQueries({ queryKey: ["payrolls"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ---- assign period ----
  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodPayroll, setPeriodPayroll] = useState<any | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType | "">("");
  const [periodRows, setPeriodRows] = useState<any[]>([]);

  const openPeriod = async (row: any) => {
    setPeriodPayroll(row);
    setPeriodType("");
    setPeriodRows([]);
    setPeriodOpen(true);
    const { data } = await supabase
      .from("payroll_periods")
      .select("*")
      .eq("payroll_id", row.id)
      .order("sort_order");
    if (data && data.length) {
      setPeriodType(data[0].period_type as PeriodType);
      setPeriodRows(data);
    }
  };

  const onPeriodTypeChange = (t: PeriodType) => {
    setPeriodType(t);
    const gen = generatePeriods(t);
    setPeriodRows(gen.map((g, i) => ({ ...g, period_type: t, sort_order: i })));
  };

  const updatePeriodField = (idx: number, field: string, value: string) => {
    setPeriodRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const savePeriods = useMutation({
    mutationFn: async () => {
      if (!periodPayroll || !periodType) throw new Error("Period Type select করুন");
      await supabase.from("payroll_periods").delete().eq("payroll_id", periodPayroll.id);
      const insertRows = periodRows.map((r, i) => ({
        payroll_id: periodPayroll.id,
        period_type: periodType,
        period_name: r.period_name,
        start_date: r.start_date,
        end_date: r.end_date,
        issue_date: r.issue_date,
        sort_order: i,
      }));
      if (insertRows.length) {
        const { error } = await supabase.from("payroll_periods").insert(insertRows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Periods সংরক্ষিত");
      setPeriodOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ---- assign payhead ----
  const [phOpen, setPhOpen] = useState(false);
  const [phPayroll, setPhPayroll] = useState<any | null>(null);
  const [phForm, setPhForm] = useState({ payhead_id: "", amount_type: "amount", amount_value: 0 });

  const { data: assignedPH, refetch: refetchAssigned } = useQuery({
    queryKey: ["assigned-payheads", phPayroll?.id],
    queryFn: async () => {
      if (!phPayroll) return [];
      const { data } = await supabase
        .from("payroll_template_payheads")
        .select("*, payheads(name, type)")
        .eq("template_id", phPayroll.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!phPayroll && phOpen,
  });

  const openPayhead = (row: any) => {
    setPhPayroll(row);
    setPhForm({ payhead_id: "", amount_type: "amount", amount_value: 0 });
    setPhOpen(true);
  };

  const assignPH = useMutation({
    mutationFn: async () => {
      if (!phPayroll || !phForm.payhead_id) throw new Error("PayHead select করুন");
      const { error } = await supabase.from("payroll_template_payheads").insert({
        template_id: phPayroll.id,
        payhead_id: phForm.payhead_id,
        amount_type: phForm.amount_type,
        amount_value: phForm.amount_value || 0,
        final_amount: phForm.amount_value || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PayHead assigned");
      setPhForm({ payhead_id: "", amount_type: "amount", amount_value: 0 });
      refetchAssigned();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePHAmount = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase
        .from("payroll_template_payheads")
        .update({ amount_value: value, final_amount: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetchAssigned(),
    onError: (e: any) => toast.error(e.message),
  });

  const removePH = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_template_payheads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      refetchAssigned();
    },
  });

  const grandTotal = (assignedPH || []).reduce((acc: number, r: any) => {
    const v = Number(r.final_amount || 0);
    return r.payheads?.type === "deduction" ? acc - v : acc + v;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">পে-রোল</h1>
          <p className="text-sm text-muted-foreground">Configure Payroll</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> New PayRoll
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Serial No.</TableHead>
                <TableHead>PayRoll Name</TableHead>
                <TableHead>Payroll Type</TableHead>
                <TableHead>Payment Type</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>
              ) : !payrolls?.length ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No payrolls</TableCell></TableRow>
              ) : (
                payrolls.map((p: any, i: number) => (
                  <TableRow key={p.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.payroll_type || "-"}</TableCell>
                    <TableCell>{p.payment_type || "-"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="secondary" onClick={() => openPeriod(p)}>Assign Period</Button>
                      <Button size="sm" variant="secondary" onClick={() => openPayhead(p)}>Assign PayHead</Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit PayRoll */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Payroll" : "Add Payroll"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payroll Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Payroll Type *</Label>
              <Select value={form.payroll_type} onValueChange={(v) => setForm({ ...form, payroll_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYROLL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={form.payment_type || "__none"} onValueChange={(v) => setForm({ ...form, payment_type: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select Payment Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— None —</SelectItem>
                  {PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Period */}
      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign Periods for Pay slip Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type *</Label>
              <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
                <SelectTrigger><SelectValue placeholder="Select Period Type" /></SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {periodRows.length > 0 && (
              <div className="border rounded">
                <div className="bg-muted px-3 py-2 font-medium">Bill Periods</div>
                <div className="p-3 space-y-3">
                  {periodRows.map((r, i) => (
                    <div key={i} className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Period Name</Label>
                        <Input value={r.period_name} onChange={(e) => updatePeriodField(i, "period_name", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Start Date</Label>
                        <Input type="date" value={r.start_date} onChange={(e) => updatePeriodField(i, "start_date", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input type="date" value={r.end_date} onChange={(e) => updatePeriodField(i, "end_date", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Issue Date</Label>
                        <Input type="date" value={r.issue_date} onChange={(e) => updatePeriodField(i, "issue_date", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>Cancel</Button>
            <Button onClick={() => savePeriods.mutate()} disabled={!periodRows.length || savePeriods.isPending}>
              {periodRows.length ? "Update Periods" : "Assign Periods"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign PayHead */}
      <Dialog open={phOpen} onOpenChange={setPhOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign a PayHead</DialogTitle></DialogHeader>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div>
              <Label>PayHead *</Label>
              <Select value={phForm.payhead_id} onValueChange={(v) => setPhForm({ ...phForm, payhead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select PayHead" /></SelectTrigger>
                <SelectContent>
                  {payheads?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={phForm.amount_type} onValueChange={(v) => setPhForm({ ...phForm, amount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount/Unit *</Label>
              <Input type="number" value={phForm.amount_value} onChange={(e) => setPhForm({ ...phForm, amount_value: Number(e.target.value) })} />
            </div>
            <Button onClick={() => assignPH.mutate()} disabled={assignPH.isPending}>Assign PayHead</Button>
          </div>

          <div className="text-xs text-muted-foreground mt-2">
            ⓘ You can update any Unit/Amount by simply clicking on its value.<br />
            ⓘ Provide Late Fee, Early out fee & Overtime fee amount as per hour.
          </div>

          <div className="border rounded mt-3">
            <div className="bg-primary text-primary-foreground px-3 py-2 font-medium">Assigned PayHead List</div>
            <Table>
              <TableBody>
                {(assignedPH || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.payheads?.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={r.final_amount}
                        className="h-8 w-24"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== Number(r.final_amount)) updatePHAmount.mutate({ id: r.id, value: v });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.payheads?.type === "deduction" ? "destructive" : "default"}>
                        {r.payheads?.type === "deduction" ? "Deduction" : "Addition"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.amount_type === "percentage" ? "Percentage" : "Amount"}</TableCell>
                    <TableCell>{r.final_amount}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => removePH.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">Grand Total</TableCell>
                  <TableCell className="font-semibold text-primary">{grandTotal}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
