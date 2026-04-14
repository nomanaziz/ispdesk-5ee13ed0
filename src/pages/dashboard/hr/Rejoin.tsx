import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";

export default function Rejoin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", rejoin_date: "", new_salary: "", new_department_id: "", new_position_id: "", remarks: "" });
  const queryClient = useQueryClient();

  const { data: inactiveEmployees } = useQuery({
    queryKey: ["employees-inactive"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("status", "inactive").order("name");
      return data || [];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments-active"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: positions } = useQuery({
    queryKey: ["positions-active"],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: rejoinRequests, isLoading } = useQuery({
    queryKey: ["rejoin_requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("rejoin_requests")
        .select("*, employees(name, employee_id, departments(name)), departments:new_department_id(name), positions:new_position_id(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rejoin_requests").insert({
        employee_id: form.employee_id,
        rejoin_date: form.rejoin_date,
        new_salary: form.new_salary ? parseFloat(form.new_salary) : 0,
        new_department_id: form.new_department_id || null,
        new_position_id: form.new_position_id || null,
        remarks: form.remarks,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rejoin_requests"] });
      toast.success("পুনরায় যোগদানের আবেদন যোগ হয়েছে");
      setDialogOpen(false);
      setForm({ employee_id: "", rejoin_date: "", new_salary: "", new_department_id: "", new_position_id: "", remarks: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, employee_id, new_salary, new_department_id, new_position_id }: any) => {
      const { error } = await supabase.from("rejoin_requests").update({ status }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const updates: any = { status: "active" };
        if (new_salary) updates.salary = new_salary;
        if (new_department_id) updates.department_id = new_department_id;
        if (new_position_id) updates.position_id = new_position_id;
        await supabase.from("employees").update(updates).eq("id", employee_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rejoin_requests"] });
      queryClient.invalidateQueries({ queryKey: ["employees-inactive"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পুনরায় যোগদান</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — রিজয়েন ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> নতুন রিজয়েন আবেদন</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="h-5 w-5" /> রিজয়েন আবেদন <Badge variant="secondary">{(rejoinRequests || []).length}</Badge></CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>কর্মী আইডি</TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>পুনরায় যোগদানের তারিখ</TableHead>
                    <TableHead>নতুন বেতন</TableHead>
                    <TableHead>নতুন ডিপার্টমেন্ট</TableHead>
                    <TableHead>নতুন পদবী</TableHead>
                    <TableHead>মন্তব্য</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rejoinRequests || []).length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">কোনো রিজয়েন আবেদন নেই</TableCell></TableRow>
                  )}
                  {(rejoinRequests || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.employees?.employee_id || "—"}</TableCell>
                      <TableCell className="font-medium">{r.employees?.name || "—"}</TableCell>
                      <TableCell>{r.rejoin_date}</TableCell>
                      <TableCell>৳{(r.new_salary || 0).toLocaleString()}</TableCell>
                      <TableCell>{r.departments?.name || "—"}</TableCell>
                      <TableCell>{r.positions?.name || "—"}</TableCell>
                      <TableCell className="max-w-32 truncate">{r.remarks || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                          {r.status === "approved" ? "অনুমোদিত" : r.status === "rejected" ? "প্রত্যাখ্যাত" : "মুলতুবি"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => updateStatus.mutate({
                              id: r.id, status: "approved", employee_id: r.employee_id,
                              new_salary: r.new_salary, new_department_id: r.new_department_id, new_position_id: r.new_position_id
                            })}><CheckCircle className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}><XCircle className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>নতুন রিজয়েন আবেদন</DialogTitle>
            <DialogDescription>নিষ্ক্রিয় কর্মীকে পুনরায় যোগদানের জন্য আবেদন করুন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>কর্মী <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="নিষ্ক্রিয় কর্মী নির্বাচন" /></SelectTrigger>
                <SelectContent>{(inactiveEmployees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>পুনরায় যোগদানের তারিখ <span className="text-destructive">*</span></Label><Input type="date" value={form.rejoin_date} onChange={(e) => setForm({ ...form, rejoin_date: e.target.value })} /></div>
              <div><Label>নতুন বেতন (৳)</Label><Input type="number" value={form.new_salary} onChange={(e) => setForm({ ...form, new_salary: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>নতুন ডিপার্টমেন্ট</Label>
                <Select value={form.new_department_id} onValueChange={(v) => setForm({ ...form, new_department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                  <SelectContent>{(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>নতুন পদবী</Label>
                <Select value={form.new_position_id} onValueChange={(v) => setForm({ ...form, new_position_id: v })}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                  <SelectContent>{(positions || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>মন্তব্য</Label><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="অতিরিক্ত মন্তব্য" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.employee_id || !form.rejoin_date || addMutation.isPending}>
              {addMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
