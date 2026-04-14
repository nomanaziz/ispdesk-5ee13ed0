import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign, Calendar, Link2 } from "lucide-react";

export default function Payroll() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");

  // Assign PayHead dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ payhead_id: "", amount_type: "amount", amount_value: 0 });

  // Payroll templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["payroll-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("payroll_templates").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Payheads
  const { data: payheads } = useQuery({
    queryKey: ["payheads-active"],
    queryFn: async () => {
      const { data } = await supabase.from("payheads").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  // Template payheads for the currently viewed template
  const { data: templatePayheads } = useQuery({
    queryKey: ["template-payheads", assignTemplateId],
    queryFn: async () => {
      if (!assignTemplateId) return [];
      const { data } = await supabase
        .from("payroll_template_payheads")
        .select("*, payheads(name, type)")
        .eq("template_id", assignTemplateId)
        .order("created_at");
      return data || [];
    },
    enabled: !!assignTemplateId,
  });

  // Create/Edit template
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("payroll_templates").update({ name: templateName }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_templates").insert({ name: templateName });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-templates"] });
      toast.success(editId ? "পেরোল আপডেট হয়েছে" : "নতুন পেরোল যোগ হয়েছে");
      setAddOpen(false);
      setEditId(null);
      setTemplateName("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-templates"] });
      toast.success("পেরোল মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Assign payhead to template
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!assignForm.payhead_id || !assignTemplateId) throw new Error("পে-হেড নির্বাচন করুন");
      const { error } = await supabase.from("payroll_template_payheads").insert({
        template_id: assignTemplateId,
        payhead_id: assignForm.payhead_id,
        amount_value: Number(assignForm.amount_value),
        amount_type: assignForm.amount_type,
        final_amount: Number(assignForm.amount_value),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template-payheads", assignTemplateId] });
      toast.success("পে-হেড অ্যাসাইন হয়েছে");
      setAssignForm({ payhead_id: "", amount_type: "amount", amount_value: 0 });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update amount inline
  const updateAmountMutation = useMutation({
    mutationFn: async ({ id, amount_value }: { id: string; amount_value: number }) => {
      const { error } = await supabase.from("payroll_template_payheads").update({ amount_value, final_amount: amount_value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["template-payheads", assignTemplateId] }),
    onError: (e: any) => toast.error(e.message),
  });

  // Remove payhead from template
  const removePayheadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_template_payheads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["template-payheads", assignTemplateId] });
      toast.success("পে-হেড সরানো হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (t: any) => {
    setEditId(t.id);
    setTemplateName(t.name);
    setAddOpen(true);
  };

  const openAssign = (templateId: string) => {
    setAssignTemplateId(templateId);
    setAssignForm({ payhead_id: "", amount_type: "amount", amount_value: 0 });
    setAssignOpen(true);
  };

  const currentTemplateName = templates?.find((t: any) => t.id === assignTemplateId)?.name || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পেরোল</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — পেরোল কনফিগারেশন</p>
        </div>
        <Button onClick={() => { setEditId(null); setTemplateName(""); setAddOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন পেরোল
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> পেরোল তালিকা
            <Badge variant="secondary" className="ml-2">{(templates || []).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">ক্রমিক</TableHead>
                    <TableHead>পেরোল নাম</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(templates || []).length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">কোনো পেরোল নেই</TableCell></TableRow>
                  )}
                  {(templates || []).map((t: any, idx: number) => (
                    <TableRow key={t.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium text-primary">{t.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openAssign(t.id)} className="gap-1">
                            <Link2 className="h-3.5 w-3.5" /> Assign PayHead
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit PayRoll Dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditId(null); setTemplateName(""); } else setAddOpen(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "পেরোল সম্পাদনা" : "নতুন পেরোল"}</DialogTitle>
            <DialogDescription>পেরোলের নাম দিন (e.g. Monthly Payroll)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>পেরোল নাম *</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Monthly Payroll" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditId(null); }}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !templateName.trim()}>
              {editId ? "আপডেট" : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign PayHead Dialog */}
      <Dialog open={assignOpen} onOpenChange={(v) => { if (!v) { setAssignOpen(false); setAssignTemplateId(null); } else setAssignOpen(true); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assign a PayHead — {currentTemplateName}</DialogTitle>
          </DialogHeader>

          {/* Assign Form */}
          <div className="grid grid-cols-4 gap-3 items-end border-b pb-4">
            <div>
              <Label>PayHead <span className="text-destructive">*</span></Label>
              <Select value={assignForm.payhead_id} onValueChange={(v) => setAssignForm({ ...assignForm, payhead_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select PayHead" /></SelectTrigger>
                <SelectContent>
                  {(payheads || [])
                    .filter((ph: any) => !templatePayheads?.find((tp: any) => tp.payhead_id === ph.id))
                    .map((ph: any) => (
                      <SelectItem key={ph.id} value={ph.id}>{ph.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={assignForm.amount_type} onValueChange={(v) => setAssignForm({ ...assignForm, amount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount/Unit <span className="text-destructive">*</span></Label>
              <Input type="number" value={assignForm.amount_value} onChange={(e) => setAssignForm({ ...assignForm, amount_value: Number(e.target.value) })} />
            </div>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !assignForm.payhead_id}>
              Assign PayHead
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ℹ You can update any Unit/Amount by simply clicking on its value.
          </p>

          {/* Assigned PayHead List */}
          <div>
            <h3 className="text-sm font-semibold mb-2 bg-muted px-3 py-2 rounded">Assigned PayHead List</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PayHead Name</TableHead>
                    <TableHead>Unit/Amount</TableHead>
                    <TableHead>PayHead Type</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Final Amount</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(templatePayheads || []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">কোনো পে-হেড অ্যাসাইন করা হয়নি</TableCell></TableRow>
                  )}
                  {(templatePayheads || []).map((tp: any) => (
                    <TableRow key={tp.id}>
                      <TableCell className="font-medium">{tp.payheads?.name || "—"}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8 text-center"
                          defaultValue={tp.amount_value}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== tp.amount_value) updateAmountMutation.mutate({ id: tp.id, amount_value: v });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={tp.payheads?.type === "allowance" ? "default" : "destructive"}>
                          {tp.payheads?.type === "allowance" ? "Addition" : "Deduction"}
                        </Badge>
                      </TableCell>
                      <TableCell>{tp.amount_type === "percentage" ? "Percentage" : "Amount"}</TableCell>
                      <TableCell className="font-medium">{tp.final_amount}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removePayheadMutation.mutate(tp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
