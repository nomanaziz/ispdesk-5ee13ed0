import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Clock, Calendar, Trash2 } from "lucide-react";

const shiftColors: Record<string, string> = {
  Morning: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Day: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Evening: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Night: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function getShiftColor(name: string) {
  for (const key of Object.keys(shiftColors)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return shiftColors[key];
  }
  return "bg-muted text-muted-foreground";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function ShiftManagement() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", start_time: "09:00", end_time: "17:00", grace_minutes: 15, late_deduction_amount: 0, late_deduction_type: "fixed" });
  const [editId, setEditId] = useState<string | null>(null);

  const now = new Date();
  const [rosterMonth, setRosterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [bulkEmployeeId, setBulkEmployeeId] = useState("");

  const { data: shifts } = useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*").order("name");
      return data || [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name, employee_id").eq("status", "active").order("name");
      return data || [];
    },
  });

  const [year, month] = rosterMonth.split("-").map(Number);
  const daysCount = getDaysInMonth(year, month - 1);
  const dates = Array.from({ length: daysCount }, (_, i) => `${rosterMonth}-${String(i + 1).padStart(2, "0")}`);

  const { data: assignments } = useQuery({
    queryKey: ["shift-assignments", rosterMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("employee_shift_assignments")
        .select("*, shifts(name)")
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1]);
      return data || [];
    },
    enabled: dates.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = { ...values, grace_minutes: Number(values.grace_minutes), late_deduction_amount: Number(values.late_deduction_amount) };
      if (editId) {
        const { error } = await supabase.from("shifts").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shifts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success(editId ? "শিফট আপডেট হয়েছে" : "শিফট যোগ হয়েছে");
      setOpen(false);
      setEditId(null);
      setForm({ name: "", start_time: "09:00", end_time: "17:00", grace_minutes: 15, late_deduction_amount: 0, late_deduction_type: "fixed" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("শিফট মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ employee_id, shift_id, date }: { employee_id: string; shift_id: string; date: string }) => {
      const { error } = await supabase.from("employee_shift_assignments").upsert(
        { employee_id, shift_id, date },
        { onConflict: "employee_id,date" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shift-assignments", rosterMonth] }),
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async () => {
      if (!bulkEmployeeId || !bulkShiftId) throw new Error("কর্মী এবং শিফট নির্বাচন করুন");
      const rows = dates.map((d) => ({ employee_id: bulkEmployeeId, shift_id: bulkShiftId, date: d }));
      const { error } = await supabase.from("employee_shift_assignments").upsert(rows, { onConflict: "employee_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-assignments", rosterMonth] });
      toast.success("পুরো মাসের শিফট সেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getAssignment = (empId: string, date: string) => assignments?.find((a: any) => a.employee_id === empId && a.date === date);

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, start_time: s.start_time, end_time: s.end_time, grace_minutes: s.grace_minutes, late_deduction_amount: s.late_deduction_amount || 0, late_deduction_type: s.late_deduction_type || "fixed" });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">শিফট ম্যানেজমেন্ট</h1>
        <p className="text-sm text-muted-foreground">HR & Payroll — শিফট সংজ্ঞায়িত এবং মাসিক রোস্টার</p>
      </div>

      <Tabs defaultValue="definitions">
        <TabsList>
          <TabsTrigger value="definitions"><Clock className="h-4 w-4 mr-1" /> শিফট সংজ্ঞা</TabsTrigger>
          <TabsTrigger value="roster"><Calendar className="h-4 w-4 mr-1" /> মাসিক রোস্টার</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm({ name: "", start_time: "09:00", end_time: "17:00", grace_minutes: 15, late_deduction_amount: 0, late_deduction_type: "fixed" }); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> নতুন শিফট</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "শিফট সম্পাদনা" : "নতুন শিফট"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>নাম</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning, Night" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>শুরুর সময়</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                    <div><Label>শেষের সময়</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                  </div>
                  <div><Label>গ্রেস মিনিট</Label><Input type="number" value={form.grace_minutes} onChange={(e) => setForm({ ...form, grace_minutes: Number(e.target.value) })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>লেট কর্তন পরিমাণ</Label><Input type="number" value={form.late_deduction_amount} onChange={(e) => setForm({ ...form, late_deduction_amount: Number(e.target.value) })} /></div>
                    <div>
                      <Label>কর্তন ধরন</Label>
                      <Select value={form.late_deduction_type} onValueChange={(v) => setForm({ ...form, late_deduction_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">নির্দিষ্ট পরিমাণ</SelectItem>
                          <SelectItem value="percentage">শতাংশ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{editId ? "আপডেট" : "সংরক্ষণ"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>শুরু</TableHead>
                    <TableHead>শেষ</TableHead>
                    <TableHead>গ্রেস (মিনিট)</TableHead>
                    <TableHead>লেট কর্তন</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(shifts || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো শিফট নেই</TableCell></TableRow>
                  )}
                  {(shifts || []).map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge className={getShiftColor(s.name)}>{s.name}</Badge></TableCell>
                      <TableCell>{s.start_time}</TableCell>
                      <TableCell>{s.end_time}</TableCell>
                      <TableCell>{s.grace_minutes}</TableCell>
                      <TableCell>{s.late_deduction_amount} ({s.late_deduction_type === "percentage" ? "%" : "৳"})</TableCell>
                      <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(s)}>সম্পাদনা</Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>মাস নির্বাচন</Label>
              <Input type="month" value={rosterMonth} onChange={(e) => setRosterMonth(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label>কর্মী</Label>
              <Select value={bulkEmployeeId} onValueChange={setBulkEmployeeId}>
                <SelectTrigger className="w-52"><SelectValue placeholder="কর্মী নির্বাচন" /></SelectTrigger>
                <SelectContent>{(employees || []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>শিফট</Label>
              <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
                <SelectTrigger className="w-44"><SelectValue placeholder="শিফট নির্বাচন" /></SelectTrigger>
                <SelectContent>{(shifts || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => bulkAssignMutation.mutate()} disabled={bulkAssignMutation.isPending}>পুরো মাস সেট করুন</Button>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">রোস্টার — {rosterMonth}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">কর্মী</TableHead>
                      {dates.map((d) => {
                        const day = new Date(d).getDate();
                        const weekday = new Date(d).toLocaleDateString("bn-BD", { weekday: "short" });
                        const isFri = new Date(d).getDay() === 5;
                        return <TableHead key={d} className={`text-center min-w-[70px] ${isFri ? "bg-red-50 dark:bg-red-950" : ""}`}>{day}<br /><span className="text-[10px]">{weekday}</span></TableHead>;
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(employees || []).length === 0 && (
                      <TableRow><TableCell colSpan={daysCount + 1} className="text-center py-8 text-muted-foreground">কোনো সক্রিয় কর্মী নেই</TableCell></TableRow>
                    )}
                    {(employees || []).map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{emp.name}</TableCell>
                        {dates.map((d) => {
                          const a = getAssignment(emp.id, d);
                          const isFri = new Date(d).getDay() === 5;
                          return (
                            <TableCell key={d} className={`p-1 text-center ${isFri ? "bg-red-50 dark:bg-red-950" : ""}`}>
                              <Select value={a?.shift_id || ""} onValueChange={(v) => assignMutation.mutate({ employee_id: emp.id, shift_id: v, date: d })}>
                                <SelectTrigger className="h-7 text-[11px] px-1 w-full border-dashed">
                                  <SelectValue placeholder="—">{a?.shifts?.name ? <span className={`text-[10px] px-1 py-0.5 rounded ${getShiftColor(a.shifts.name)}`}>{a.shifts.name.substring(0, 3)}</span> : "—"}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>{(shifts || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
