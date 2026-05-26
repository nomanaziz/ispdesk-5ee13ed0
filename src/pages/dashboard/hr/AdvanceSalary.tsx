import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";

export default function AdvanceSalary() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", amount: 0, request_date: new Date().toISOString().slice(0, 10), reason: "" });

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => (await supabase.from("employees").select("id, name, employee_id").order("name")).data || [],
  });

  const { data: items, refetch } = useQuery({
    queryKey: ["advance-salary"],
    queryFn: async () => (await supabase.from("advance_salary").select("*, employees(name, employee_id)").order("created_at", { ascending: false })).data || [],
  });

  const save = async () => {
    if (!form.employee_id || form.amount <= 0) return toast.error("কর্মী ও পরিমাণ দিন");
    const { error } = await supabase.from("advance_salary").insert(form);
    if (error) return toast.error(error.message);
    toast.success("অগ্রিম request যোগ হলো");
    setOpen(false);
    setForm({ employee_id: "", amount: 0, request_date: new Date().toISOString().slice(0, 10), reason: "" });
    refetch();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("advance_salary").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("আপডেট হলো");
    qc.invalidateQueries({ queryKey: ["advance-salary"] });
  };

  const remove = async (id: string) => {
    if (!confirm("মুছে দেবেন?")) return;
    await supabase.from("advance_salary").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">অগ্রিম বেতন</h1>
          <p className="text-sm text-muted-foreground">Advance Salary — Approved advance পরবর্তী মাসের পে-স্লিপে auto-deduct হবে</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> নতুন</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>সব Request</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>কর্মী</TableHead>
                <TableHead>তারিখ</TableHead>
                <TableHead className="text-right">পরিমাণ</TableHead>
                <TableHead>কারণ</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>Adjusted</TableHead>
                <TableHead className="text-right">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items || []).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.employees?.name}</div>
                    <div className="text-xs text-muted-foreground">{a.employees?.employee_id}</div>
                  </TableCell>
                  <TableCell>{a.request_date}</TableCell>
                  <TableCell className="text-right font-bold">৳{Number(a.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.reason}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "approved" ? "default" : a.status === "adjusted" ? "secondary" : a.status === "rejected" ? "destructive" : "outline"}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{a.adjusted_in_month || "—"}</TableCell>
                  <TableCell className="text-right">
                    {a.status === "pending" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(a.id, "approved")}><Check className="h-4 w-4 text-green-600" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setStatus(a.id, "rejected")}><X className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)} className="text-destructive">মুছুন</Button>
                  </TableCell>
                </TableRow>
              ))}
              {(items || []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো request নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন অগ্রিম Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>কর্মী *</Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="কর্মী নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {(employees || []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>পরিমাণ (৳) *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>তারিখ</Label>
                <Input type="date" value={form.request_date} onChange={(e) => setForm({ ...form, request_date: e.target.value })} />
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
