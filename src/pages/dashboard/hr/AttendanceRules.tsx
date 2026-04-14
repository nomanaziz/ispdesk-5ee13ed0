import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Shield, Trash2 } from "lucide-react";

const defaultForm = {
  name: "", late_after_minutes: 15, half_day_after_minutes: 120, absent_after_minutes: 240,
  late_deduction: 0, late_deduction_type: "fixed", absent_deduction: 0, absent_deduction_type: "fixed",
};

export default function AttendanceRules() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: rules } = useQuery({
    queryKey: ["attendance-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_rules").select("*").order("name");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        ...values,
        late_after_minutes: Number(values.late_after_minutes),
        half_day_after_minutes: Number(values.half_day_after_minutes),
        absent_after_minutes: Number(values.absent_after_minutes),
        late_deduction: Number(values.late_deduction),
        absent_deduction: Number(values.absent_deduction),
      };
      if (editId) {
        const { error } = await supabase.from("attendance_rules").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance_rules").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-rules"] });
      toast.success(editId ? "নিয়ম আপডেট হয়েছে" : "নিয়ম যোগ হয়েছে");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance-rules"] });
      toast.success("নিয়ম মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => { setOpen(false); setEditId(null); setForm(defaultForm); };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      name: r.name, late_after_minutes: r.late_after_minutes, half_day_after_minutes: r.half_day_after_minutes,
      absent_after_minutes: r.absent_after_minutes, late_deduction: r.late_deduction || 0,
      late_deduction_type: r.late_deduction_type || "fixed", absent_deduction: r.absent_deduction || 0,
      absent_deduction_type: r.absent_deduction_type || "fixed",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">অ্যাটেনডেন্স নিয়ম</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — লেট/অনুপস্থিতি কর্তন কনফিগারেশন</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> নতুন নিয়ম</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "নিয়ম সম্পাদনা" : "নতুন অ্যাটেনডেন্স নিয়ম"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>নিয়মের নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Default Rule" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>লেট (মিনিট পর)</Label><Input type="number" value={form.late_after_minutes} onChange={(e) => setForm({ ...form, late_after_minutes: Number(e.target.value) })} /></div>
                <div><Label>অর্ধদিবস (মিনিট পর)</Label><Input type="number" value={form.half_day_after_minutes} onChange={(e) => setForm({ ...form, half_day_after_minutes: Number(e.target.value) })} /></div>
                <div><Label>অনুপস্থিত (মিনিট পর)</Label><Input type="number" value={form.absent_after_minutes} onChange={(e) => setForm({ ...form, absent_after_minutes: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>লেট কর্তন</Label><Input type="number" value={form.late_deduction} onChange={(e) => setForm({ ...form, late_deduction: Number(e.target.value) })} /></div>
                <div>
                  <Label>ধরন</Label>
                  <Select value={form.late_deduction_type} onValueChange={(v) => setForm({ ...form, late_deduction_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fixed">নির্দিষ্ট (৳)</SelectItem><SelectItem value="percentage">শতাংশ (%)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>অনুপস্থিত কর্তন</Label><Input type="number" value={form.absent_deduction} onChange={(e) => setForm({ ...form, absent_deduction: Number(e.target.value) })} /></div>
                <div>
                  <Label>ধরন</Label>
                  <Select value={form.absent_deduction_type} onValueChange={(v) => setForm({ ...form, absent_deduction_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fixed">নির্দিষ্ট (৳)</SelectItem><SelectItem value="percentage">শতাংশ (%)</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}>{editId ? "আপডেট" : "সংরক্ষণ"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> অ্যাটেনডেন্স নিয়মাবলি</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>লেট পর (মি.)</TableHead>
                  <TableHead>অর্ধদিবস পর (মি.)</TableHead>
                  <TableHead>অনুপস্থিত পর (মি.)</TableHead>
                  <TableHead>লেট কর্তন</TableHead>
                  <TableHead>অনুপস্থিত কর্তন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rules || []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো নিয়ম নেই</TableCell></TableRow>
                )}
                {(rules || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.late_after_minutes}</TableCell>
                    <TableCell>{r.half_day_after_minutes}</TableCell>
                    <TableCell>{r.absent_after_minutes}</TableCell>
                    <TableCell>{r.late_deduction} {r.late_deduction_type === "percentage" ? "%" : "৳"}</TableCell>
                    <TableCell>{r.absent_deduction} {r.absent_deduction_type === "percentage" ? "%" : "৳"}</TableCell>
                    <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>সম্পাদনা</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
