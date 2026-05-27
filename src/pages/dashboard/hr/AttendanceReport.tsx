import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Download, Users as UsersIcon } from "lucide-react";

type DayRow = {
  date: string;
  dayName: string;
  inTime: string | null;
  outTime: string | null;
  totalHours: number | null;
  status: "Present" | "OUT Missing" | "IN Missing" | "Absent" | "Weekend";
};

function fmtTime(d: Date | null) {
  if (!d) return null;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getMonthDays(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const days: { date: string; dayName: string; jsDay: number }[] = [];
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m - 1, d);
    days.push({
      date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      dayName: dt.toLocaleDateString("en-US", { weekday: "short" }),
      jsDay: dt.getDay(),
    });
  }
  return days;
}

export default function AttendanceReport() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [employeeId, setEmployeeId] = useState<string>("all");

  const { data: employees } = useQuery({
    queryKey: ["employees-att-report"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, employee_id, name, device_user_id, zkteco_device_id")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  // weekend setting
  const { data: settings } = useQuery({
    queryKey: ["hr-settings-weekends"],
    queryFn: async () => {
      const { data } = await supabase.from("hr_settings").select("setting_value").eq("setting_key", "attendance_settings").maybeSingle();
      return (data?.setting_value as any) || { weekend_days: ["FRIDAY"] };
    },
  });

  // Range
  const [y, m] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  // ZKTeco logs joined to device-users mapping (filtered by employee if chosen)
  const { data: zlogs } = useQuery({
    queryKey: ["zkteco-logs", month, employeeId],
    enabled: !!employees,
    queryFn: async () => {
      // Build a list of (device_id, device_user_id) pairs we care about
      const targets = (employees || []).filter((e: any) =>
        (employeeId === "all" || e.id === employeeId) && e.device_user_id
      );
      if (targets.length === 0) return [];

      const startISO = `${monthStart}T00:00:00`;
      const endISO = `${monthEnd}T23:59:59`;
      // Query all logs in the month for these device_user_ids
      const userIds = Array.from(new Set(targets.map((t: any) => t.device_user_id)));
      const { data } = await supabase
        .from("zkteco_attendance_logs")
        .select("device_user_id, device_id, punch_time")
        .in("device_user_id", userIds)
        .gte("punch_time", startISO)
        .lte("punch_time", endISO)
        .order("punch_time", { ascending: true });
      return data || [];
    },
  });

  // Geo / attendance table rows
  const { data: attRows } = useQuery({
    queryKey: ["attendance-rows", month, employeeId],
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select("employee_id, date, check_in, check_out, punch_in_at, punch_out_at")
        .gte("date", monthStart)
        .lte("date", monthEnd);
      if (employeeId !== "all") q = q.eq("employee_id", employeeId);
      const { data } = await q;
      return data || [];
    },
  });

  // Build per-employee per-day
  const report = useMemo(() => {
    const days = getMonthDays(month);
    const weekendNames = (settings?.weekend_days || ["FRIDAY"]).map((w: string) => w.toUpperCase());
    const dayNameMap = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

    const empList = (employees || []).filter((e: any) => employeeId === "all" || e.id === employeeId);

    // Index ZK logs by employee.id via device_user_id match
    const empByDeviceUser = new Map<string, string>();
    (employees || []).forEach((e: any) => {
      if (e.device_user_id) empByDeviceUser.set(String(e.device_user_id), e.id);
    });

    const punchMap: Record<string, Record<string, Date[]>> = {}; // empId -> date -> times
    (zlogs || []).forEach((l: any) => {
      const empId = empByDeviceUser.get(String(l.device_user_id));
      if (!empId) return;
      const dt = new Date(l.punch_time);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
      punchMap[empId] = punchMap[empId] || {};
      punchMap[empId][dateStr] = punchMap[empId][dateStr] || [];
      punchMap[empId][dateStr].push(dt);
    });
    // Add geo-attendance rows as virtual punches (in + out)
    (attRows || []).forEach((r: any) => {
      const empId = r.employee_id;
      if (!empId) return;
      const dateStr = r.date;
      punchMap[empId] = punchMap[empId] || {};
      punchMap[empId][dateStr] = punchMap[empId][dateStr] || [];
      if (r.punch_in_at) punchMap[empId][dateStr].push(new Date(r.punch_in_at));
      else if (r.check_in) punchMap[empId][dateStr].push(new Date(`${dateStr}T${r.check_in}`));
      if (r.punch_out_at) punchMap[empId][dateStr].push(new Date(r.punch_out_at));
      else if (r.check_out) punchMap[empId][dateStr].push(new Date(`${dateStr}T${r.check_out}`));
    });

    return empList.map((emp: any) => {
      const dayRows: DayRow[] = days.map((d) => {
        const isWeekend = weekendNames.includes(dayNameMap[d.jsDay]);
        const punches = (punchMap[emp.id]?.[d.date] || []).sort((a, b) => a.getTime() - b.getTime());
        if (punches.length === 0) {
          // future dates → blank
          const isFuture = new Date(d.date) > new Date();
          return {
            date: d.date,
            dayName: d.dayName,
            inTime: null,
            outTime: null,
            totalHours: null,
            status: isWeekend ? "Weekend" : isFuture ? "Weekend" : "Absent",
          };
        }
        const inT = punches[0];
        const outT = punches.length > 1 ? punches[punches.length - 1] : null;
        const hours = outT ? Math.round(((outT.getTime() - inT.getTime()) / 3600000) * 100) / 100 : null;
        return {
          date: d.date,
          dayName: d.dayName,
          inTime: fmtTime(inT),
          outTime: fmtTime(outT),
          totalHours: hours,
          status: !outT ? "OUT Missing" : "Present",
        };
      });
      const present = dayRows.filter((r) => r.status === "Present").length;
      const absent = dayRows.filter((r) => r.status === "Absent").length;
      const partial = dayRows.filter((r) => r.status === "OUT Missing" || r.status === "IN Missing").length;
      const totalHours = dayRows.reduce((s, r) => s + (r.totalHours || 0), 0);
      return { employee: emp, rows: dayRows, present, absent, partial, totalHours };
    });
  }, [employees, zlogs, attRows, month, employeeId, settings]);

  const exportCsv = () => {
    const lines: string[] = ["Employee,Date,Day,IN,OUT,Hours,Status"];
    report.forEach((r) => {
      r.rows.forEach((d) => {
        lines.push([r.employee.employee_id, r.employee.name, d.date, d.dayName, d.inTime || "", d.outTime || "", d.totalHours ?? "", d.status].join(","));
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Report</h1>
          <p className="text-sm text-muted-foreground">প্রতিদিনের IN/OUT — প্রথম punch = IN, শেষ punch = OUT</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" /> CSV Export</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব employee</SelectItem>
                {(employees || []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id}){e.device_user_id ? "" : " · ⚠ device map নাই"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {report.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">কোনো employee নেই</CardContent></Card>
      )}

      {report.map((r) => (
        <Card key={r.employee.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <UsersIcon className="h-4 w-4" />
              {r.employee.name} <span className="text-xs text-muted-foreground">({r.employee.employee_id})</span>
              <div className="ml-auto flex gap-2 text-xs">
                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Present: {r.present}</Badge>
                <Badge variant="outline" className="border-amber-500 text-amber-700">OUT/IN Missing: {r.partial}</Badge>
                <Badge variant="destructive">Absent: {r.absent}</Badge>
                <Badge variant="secondary">Total: {r.totalHours.toFixed(1)}h</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!r.employee.device_user_id && (
              <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 p-2 rounded mb-2">
                ⚠ এই employee ZKTeco device-এর সাথে map করা নেই। ZKTeco Devices page থেকে map করুন।
              </p>
            )}
            <div className="border rounded max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead><CalendarDays className="h-3 w-3 inline" /> তারিখ</TableHead>
                    <TableHead>দিন</TableHead>
                    <TableHead>IN</TableHead>
                    <TableHead>OUT</TableHead>
                    <TableHead>ঘণ্টা</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.rows.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-mono text-xs">{d.date}</TableCell>
                      <TableCell className="text-xs">{d.dayName}</TableCell>
                      <TableCell className="text-xs">{d.inTime || "—"}</TableCell>
                      <TableCell className="text-xs">{d.outTime || "—"}</TableCell>
                      <TableCell className="text-xs">{d.totalHours ?? "—"}</TableCell>
                      <TableCell>
                        {d.status === "Present" && <Badge className="bg-green-600 hover:bg-green-700">Present</Badge>}
                        {d.status === "OUT Missing" && <Badge variant="outline" className="border-amber-500 text-amber-700">OUT Missing</Badge>}
                        {d.status === "IN Missing" && <Badge variant="outline" className="border-amber-500 text-amber-700">IN Missing</Badge>}
                        {d.status === "Absent" && <Badge variant="destructive">Absent</Badge>}
                        {d.status === "Weekend" && <Badge variant="secondary">Weekend</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
