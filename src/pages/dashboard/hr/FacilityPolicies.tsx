import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "accommodation", label: "আবাসন (Accommodation)" },
  { value: "food", label: "খাবার / লাঞ্চ" },
  { value: "overtime_food", label: "ওভারটাইম / আউটডোর খাবার" },
  { value: "custom", label: "অন্যান্য" },
];

const MODE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  accommodation: [
    { value: "company_provided", label: "কোম্পানি প্রদান করে" },
    { value: "house_rent_allowance", label: "মাসিক বাড়ি ভাড়া ভাতা (cash)" },
  ],
  food: [
    { value: "full_subsidized", label: "Full subsidized (কোম্পানি পুরো খরচ বহন)" },
    { value: "partial_subsidized", label: "Partial subsidized (অংশ employee দিবে)" },
    { value: "self_paid", label: "Self-paid (employee নিজেই কিনবে)" },
    { value: "monthly_cash", label: "মাসিক fixed cash" },
    { value: "per_duty_day_cash", label: "প্রতি ডিউটি দিনে cash" },
  ],
  overtime_food: [
    { value: "per_duty_day_cash", label: "ওভারটাইম/আউটডোর দিনে per-day cash" },
  ],
  custom: [
    { value: "monthly_cash", label: "মাসিক fixed" },
    { value: "per_duty_day_cash", label: "প্রতি দিন" },
  ],
};

const TRIGGER_OPTIONS = [
  { value: "always", label: "সব সময় (fixed monthly)" },
  { value: "present_only", label: "শুধু উপস্থিত দিনে" },
  { value: "present_or_overtime", label: "উপস্থিত বা ওভারটাইম দিনে" },
  { value: "overtime_only", label: "শুধু ওভারটাইম দিনে" },
  { value: "outdoor_only", label: "শুধু আউটডোর ডিউটি দিনে" },
];

const PER_UNIT = [
  { value: "month", label: "মাসিক" },
  { value: "day", label: "প্রতি দিন" },
  { value: "meal", label: "প্রতি বেলা" },
];

interface FormState {
  name: string;
  type: string;
  mode: string;
  trigger_condition: string;
  amount: string;
  company_share: string;
  employee_share: string;
  per_unit: string;
  linked_payhead_id: string;
  is_deduction: boolean;
  active: boolean;
  description: string;
}

const EMPTY: FormState = {
  name: "",
  type: "food",
  mode: "monthly_cash",
  trigger_condition: "always",
  amount: "0",
  company_share: "0",
  employee_share: "0",
  per_unit: "month",
  linked_payhead_id: "",
  is_deduction: false,
  active: true,
  description: "",
};

export default function FacilityPolicies() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: policies, isLoading } = useQuery({
    queryKey: ["facility_policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facility_policies" as any)
        .select("*, payheads(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payheads } = useQuery({
    queryKey: ["payheads-for-facility"],
    queryFn: async () => {
      const { data } = await supabase.from("payheads").select("id,name,type").eq("status", "active");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        type: form.type,
        mode: form.mode,
        trigger_condition: form.trigger_condition,
        amount: Number(form.amount) || 0,
        company_share: Number(form.company_share) || 0,
        employee_share: Number(form.employee_share) || 0,
        per_unit: form.per_unit,
        linked_payhead_id: form.linked_payhead_id || null,
        is_deduction: form.is_deduction,
        active: form.active,
        description: form.description || null,
      };
      if (editing) {
        const { error } = await supabase.from("facility_policies" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("facility_policies" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility_policies"] });
      toast.success(editing ? "আপডেট হয়েছে" : "যোগ হয়েছে");
      close();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_policies" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facility_policies"] });
      toast.success("ডিলিট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function close() {
    setDialog(false);
    setEditing(null);
    setForm(EMPTY);
  }

  function openEdit(row: any) {
    setEditing(row);
    setForm({
      name: row.name || "",
      type: row.type,
      mode: row.mode,
      trigger_condition: row.trigger_condition || "always",
      amount: String(row.amount ?? 0),
      company_share: String(row.company_share ?? 0),
      employee_share: String(row.employee_share ?? 0),
      per_unit: row.per_unit || "month",
      linked_payhead_id: row.linked_payhead_id || "",
      is_deduction: !!row.is_deduction,
      active: row.active !== false,
      description: row.description || "",
    });
    setDialog(true);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setDialog(true);
  }

  const modeOpts = MODE_OPTIONS[form.type] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">সুবিধা পলিসি (Facility Policies)</h1>
          <p className="text-sm text-muted-foreground">আবাসন, খাবার, ওভারটাইম ভাতা ইত্যাদির টেমপ্লেট</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />নতুন পলিসি</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">পলিসি তালিকা</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>লোড হচ্ছে...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>মোড</TableHead>
                  <TableHead>ট্রিগার</TableHead>
                  <TableHead className="text-right">পরিমাণ</TableHead>
                  <TableHead>পে-হেড</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(policies || []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{TYPE_OPTIONS.find(t => t.value === p.type)?.label || p.type}</TableCell>
                    <TableCell className="text-xs">{p.mode}</TableCell>
                    <TableCell className="text-xs">{p.trigger_condition}</TableCell>
                    <TableCell className="text-right">৳{Number(p.amount).toLocaleString()} / {p.per_unit}</TableCell>
                    <TableCell className="text-xs">{p.payheads?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge>
                      {p.is_deduction && <Badge variant="destructive" className="ml-1">Deduction</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("ডিলিট করবেন?")) remove.mutate(p.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(policies || []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো পলিসি নেই</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "পলিসি এডিট" : "নতুন পলিসি"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Lunch Allowance" />
            </div>
            <div>
              <Label>ধরন *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, mode: MODE_OPTIONS[v]?.[0]?.value || "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>মোড *</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{modeOpts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>ট্রিগার (কখন পাবে)</Label>
              <Select value={form.trigger_condition} onValueChange={(v) => setForm({ ...form, trigger_condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>একক</Label>
              <Select value={form.per_unit} onValueChange={(v) => setForm({ ...form, per_unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PER_UNIT.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>মোট পরিমাণ (৳)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>কোম্পানি অংশ (৳)</Label>
              <Input type="number" value={form.company_share} onChange={(e) => setForm({ ...form, company_share: e.target.value })} />
            </div>
            <div>
              <Label>Employee অংশ (৳)</Label>
              <Input type="number" value={form.employee_share} onChange={(e) => setForm({ ...form, employee_share: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>লিঙ্ক পে-হেড (payroll এ যাবে)</Label>
              <Select value={form.linked_payhead_id || "none"} onValueChange={(v) => setForm({ ...form, linked_payhead_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="পে-হেড নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— কোনোটি না —</SelectItem>
                  {(payheads || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>বিবরণ</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_deduction} onCheckedChange={(c) => setForm({ ...form, is_deduction: c })} />
              <Label>কর্তন হিসেবে গণ্য (deduction)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(c) => setForm({ ...form, active: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>বাতিল</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>সেভ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
