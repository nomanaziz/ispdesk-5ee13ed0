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
import { Plus, UserX, CheckCircle, XCircle } from "lucide-react";

export default function Resignations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", resign_date: "", last_working_date: "", reason: "" });
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: resignations, isLoading } = useQuery({
    queryKey: ["resignations"],
    queryFn: async () => {
      const { data } = await supabase.from("resignations").select("*, employees(name, employee_id, departments(name))").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("resignations").insert(form as any);
      if (error) throw error;
      // Mark employee as inactive
      await supabase.from("employees").update({ status: "inactive" }).eq("id", form.employee_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resignations"] });
      queryClient.invalidateQueries({ queryKey: ["employees-active"] });
      toast.success("পদত্যাগ যোগ হয়েছে");
      setDialogOpen(false);
      setForm({ employee_id: "", resign_date: "", last_working_date: "", reason: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("resignations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resignations"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পদত্যাগ</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — পদত্যাগ ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> নতুন পদত্যাগ</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><UserX className="h-5 w-5" /> পদত্যাগ তালিকা <Badge variant="secondary">{(resignations || []).length}</Badge></CardTitle>
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
                    <TableHead>ডিপার্টমেন্ট</TableHead>
                    <TableHead>পদত্যাগের তারিখ</TableHead>
                    <TableHead>শেষ কর্মদিবস</TableHead>
                    <TableHead>কারণ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(resignations || []).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো পদত্যাগ নেই</TableCell></TableRow>
                  )}
                  {(resignations || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.employees?.employee_id || "—"}</TableCell>
                      <TableCell className="font-medium">{r.employees?.name || "—"}</TableCell>
                      <TableCell>{r.employees?.departments?.name || "—"}</TableCell>
                      <TableCell>{r.resign_date}</TableCell>
                      <TableCell>{r.last_working_date || "—"}</TableCell>
                      <TableCell className="max-w-48 truncate">{r.reason || "—"}</TableCell>
                      <TableCell><Badge variant={statusColor(r.status)}>{r.status === "approved" ? "অনুমোদিত" : r.status === "rejected" ? "প্রত্যাখ্যাত" : "মুলতুবি"}</Badge></TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="text-green-600" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}><CheckCircle className="h-4 w-4" /></Button>
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
            <DialogTitle>নতুন পদত্যাগ</DialogTitle>
            <DialogDescription>কর্মীর পদত্যাগের তথ্য দিন</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>কর্মী <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="কর্মী নির্বাচন" /></SelectTrigger>
                <SelectContent>{(employees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>পদত্যাগের তারিখ <span className="text-destructive">*</span></Label><Input type="date" value={form.resign_date} onChange={(e) => setForm({ ...form, resign_date: e.target.value })} /></div>
              <div><Label>শেষ কর্মদিবস</Label><Input type="date" value={form.last_working_date} onChange={(e) => setForm({ ...form, last_working_date: e.target.value })} /></div>
            </div>
            <div><Label>কারণ</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="পদত্যাগের কারণ" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.employee_id || !form.resign_date || addMutation.isPending}>
              {addMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
