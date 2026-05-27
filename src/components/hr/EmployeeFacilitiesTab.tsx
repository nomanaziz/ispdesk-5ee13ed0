import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeFacilitiesTab({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [policyId, setPolicyId] = useState("");
  const [override, setOverride] = useState("");
  const [effFrom, setEffFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effTo, setEffTo] = useState("");
  const [notes, setNotes] = useState("");

  const { data: assigned } = useQuery({
    queryKey: ["employee-facilities", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_facilities" as any)
        .select("*, facility_policies(name, type, mode, amount, per_unit, is_deduction)")
        .eq("employee_id", employeeId)
        .order("effective_from", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: policies } = useQuery({
    queryKey: ["facility_policies-active"],
    queryFn: async () => {
      const { data } = await supabase.from("facility_policies" as any).select("id,name,type,mode,amount,per_unit").eq("active", true).order("name");
      return data || [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employee_facilities" as any).insert({
        employee_id: employeeId,
        facility_policy_id: policyId,
        override_amount: override ? Number(override) : null,
        effective_from: effFrom,
        effective_to: effTo || null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-facilities", employeeId] });
      toast.success("সুবিধা অ্যাসাইন হয়েছে");
      setDialog(false);
      setPolicyId(""); setOverride(""); setEffTo(""); setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_facilities" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-facilities", employeeId] });
      toast.success("সরিয়ে দেওয়া হয়েছে");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">অ্যাসাইনকৃত সুবিধা</CardTitle>
        <Button size="sm" onClick={() => setDialog(true)} className="gap-1"><Plus className="h-4 w-4" />সুবিধা যোগ</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>পলিসি</TableHead>
              <TableHead>ধরন</TableHead>
              <TableHead className="text-right">পরিমাণ</TableHead>
              <TableHead>কার্যকর</TableHead>
              <TableHead>নোট</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(assigned || []).map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.facility_policies?.name}</TableCell>
                <TableCell className="text-xs">
                  {a.facility_policies?.type}
                  {a.facility_policies?.is_deduction && <Badge variant="destructive" className="ml-1">Deduction</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  ৳{Number(a.override_amount ?? a.facility_policies?.amount ?? 0).toLocaleString()} / {a.facility_policies?.per_unit}
                  {a.override_amount && <Badge variant="outline" className="ml-1 text-xs">override</Badge>}
                </TableCell>
                <TableCell className="text-xs">{a.effective_from}{a.effective_to ? ` → ${a.effective_to}` : ""}</TableCell>
                <TableCell className="text-xs">{a.notes || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("সরিয়ে দিবেন?")) remove.mutate(a.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(assigned || []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">কোনো সুবিধা অ্যাসাইন করা নেই</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>সুবিধা অ্যাসাইন</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>পলিসি *</Label>
              <Select value={policyId} onValueChange={setPolicyId}>
                <SelectTrigger><SelectValue placeholder="পলিসি নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {(policies || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ৳{Number(p.amount).toLocaleString()}/{p.per_unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Override পরিমাণ (ঐচ্ছিক)</Label>
              <Input type="number" value={override} onChange={(e) => setOverride(e.target.value)} placeholder="ডিফল্ট পরিমাণ override করতে চাইলে" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>কার্যকর হবে</Label>
                <Input type="date" value={effFrom} onChange={(e) => setEffFrom(e.target.value)} />
              </div>
              <div>
                <Label>শেষ তারিখ (ঐচ্ছিক)</Label>
                <Input type="date" value={effTo} onChange={(e) => setEffTo(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>নোট</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>বাতিল</Button>
            <Button onClick={() => add.mutate()} disabled={!policyId || add.isPending}>অ্যাসাইন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
