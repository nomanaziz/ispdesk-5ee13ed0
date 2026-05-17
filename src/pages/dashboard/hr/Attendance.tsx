import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, CheckCircle, XCircle, Clock, UserX } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const statusOptions = [
  { value: "present", label: "উপস্থিত", color: "bg-green-500" },
  { value: "absent", label: "অনুপস্থিত", color: "bg-red-500" },
  { value: "late", label: "বিলম্বে", color: "bg-yellow-500" },
  { value: "half_day", label: "অর্ধদিবস", color: "bg-orange-500" },
  { value: "leave", label: "ছুটি", color: "bg-blue-500" },
];

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(today);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name), shifts:default_shift_id(id,name,start_time,end_time)").eq("status", "active").order("name");
      return data || [];
    },
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("date", selectedDate);
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ employee_id, field, value }: { employee_id: string; field: string; value: string }) => {
      const existing = attendance?.find((a: any) => a.employee_id === employee_id);
      if (existing) {
        const { error } = await supabase.from("attendance").update({ [field]: value } as any).eq("id", existing.id);
        if (error) throw error;
      } else {
        const emp: any = employees?.find((e: any) => e.id === employee_id);
        const payload: any = { employee_id, date: selectedDate, [field]: value };
        if (emp?.default_shift_id) payload.shift_id = emp.default_shift_id;
        const { error } = await supabase.from("attendance").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedDate] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkMarkPresent = useMutation({
    mutationFn: async () => {
      const unmarked = (employees || []).filter(
        (e: any) => !attendance?.find((a: any) => a.employee_id === e.id)
      );
      for (const emp of unmarked) {
        const payload: any = {
          employee_id: emp.id,
          date: selectedDate,
          status: "present",
          check_in: (emp as any).shifts?.start_time?.slice(0, 5) || "09:00",
        };
        if ((emp as any).default_shift_id) payload.shift_id = (emp as any).default_shift_id;
        const { error } = await supabase.from("attendance").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedDate] });
      toast.success("সকলকে উপস্থিত হিসেবে চিহ্নিত করা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getAttendance = (empId: string) => attendance?.find((a: any) => a.employee_id === empId);

  const counts = {
    present: attendance?.filter((a: any) => a.status === "present").length || 0,
    absent: attendance?.filter((a: any) => a.status === "absent").length || 0,
    late: attendance?.filter((a: any) => a.status === "late").length || 0,
    leave: attendance?.filter((a: any) => a.status === "leave" || a.status === "half_day").length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">দৈনিক উপস্থিতি</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — অ্যাটেনডেন্স ম্যানেজমেন্ট</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-44" />
          <Button onClick={() => bulkMarkPresent.mutate()} disabled={bulkMarkPresent.isPending}>সকলকে উপস্থিত</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><CheckCircle className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">{counts.present}</p><p className="text-xs text-muted-foreground">উপস্থিত</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><XCircle className="h-8 w-8 text-red-500" /><div><p className="text-2xl font-bold">{counts.absent}</p><p className="text-xs text-muted-foreground">অনুপস্থিত</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-yellow-500" /><div><p className="text-2xl font-bold">{counts.late}</p><p className="text-xs text-muted-foreground">বিলম্বে</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><UserX className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">{counts.leave}</p><p className="text-xs text-muted-foreground">ছুটি</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> উপস্থিতি — {selectedDate}
            <Badge variant="secondary" className="ml-2">{(employees || []).length} জন</Badge>
          </CardTitle>
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
                    <TableHead>চেক-ইন</TableHead>
                    <TableHead>চেক-আউট</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>সোর্স</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees || []).length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো সক্রিয় কর্মী নেই</TableCell></TableRow>
                  )}
                  {(employees || []).map((emp: any) => {
                    const att = getAttendance(emp.id);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-mono">{emp.employee_id}</TableCell>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.departments?.name || "—"}</TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            className="w-28"
                            value={att?.check_in || ""}
                            onChange={(e) => upsertMutation.mutate({ employee_id: emp.id, field: "check_in", value: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            className="w-28"
                            value={att?.check_out || ""}
                            onChange={(e) => upsertMutation.mutate({ employee_id: emp.id, field: "check_out", value: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={att?.status || ""}
                            onValueChange={(v) => upsertMutation.mutate({ employee_id: emp.id, field: "status", value: v })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="নির্বাচন" />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={att?.source === "device" ? "default" : "secondary"} className="text-[11px]">
                            {att?.source === "device" ? "ডিভাইস" : "ম্যানুয়াল"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
