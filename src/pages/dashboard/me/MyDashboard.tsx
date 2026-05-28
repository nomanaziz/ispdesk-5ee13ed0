import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Wallet, Calendar, ClipboardCheck, TicketCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function MyDashboard() {
  const { employee, primaryRoleName, extraRoleNames, widgetPermissions, loading } = useEmployeeContext();

  const empId = employee?.id;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthIso = monthStart.toISOString().slice(0, 10);

  const { data: latestPayroll } = useQuery({
    queryKey: ["my-latest-payroll", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll").select("*").eq("employee_id", empId!).order("month", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["my-attendance-month", empId, monthIso],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance" as any).select("status, date").eq("employee_id", empId!).gte("date", monthIso);
      return (data as any[]) ?? [];
    },
  });

  const present = attendance?.filter((a) => a.status === "present").length ?? 0;
  const absent = attendance?.filter((a) => a.status === "absent").length ?? 0;
  const late = attendance?.filter((a) => a.status === "late").length ?? 0;

  const { data: leaveBalance } = useQuery({
    queryKey: ["my-leave-balance", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances" as any).select("remaining_days").eq("employee_id", empId!);
      return (data as any[]) ?? [];
    },
  });
  const leaveLeft = (leaveBalance ?? []).reduce((s, l: any) => s + Number(l.remaining_days || 0), 0);

  if (loading) return <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  if (!employee) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        আপনার অ্যাকাউন্ট কোনো কর্মীর সাথে যুক্ত নয়। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।
      </CardContent></Card>
    );
  }

  const payable = Number(latestPayroll?.net_salary || 0);
  const paid = Number(latestPayroll?.paid_amount || 0);
  const due = Math.max(0, payable - paid);

  return (
    <div className="space-y-6">
      {/* TOP ROW — fixed employee widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile card */}
        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-lg bg-background overflow-hidden flex items-center justify-center shrink-0">
              {employee.image_url ? (
                <img src={employee.image_url} alt={employee.name} className="h-full w-full object-cover" />
              ) : <User className="h-7 w-7 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{employee.name}</p>
              <p className="text-xs text-muted-foreground">{employee.employee_id}</p>
              <Badge variant="outline" className="mt-1 text-[10px]">{primaryRoleName || "Employee"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Latest payslip */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Wallet className="h-4 w-4" /> সর্বশেষ পে-স্লিপ</div>
            <p className="text-2xl font-bold mt-1">৳{payable.toLocaleString()}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="outline" className="text-green-700 border-green-300">পরিশোধিত: ৳{paid.toLocaleString()}</Badge>
              {due > 0 && <Badge variant="destructive">বকেয়া: ৳{due.toLocaleString()}</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Attendance summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><ClipboardCheck className="h-4 w-4" /> এ মাসের হাজিরা</div>
            <p className="text-2xl font-bold mt-1">{present} দিন উপস্থিত</p>
            <div className="flex gap-2 mt-2 text-xs">
              <Badge variant="outline">অনুপস্থিত: {absent}</Badge>
              {late > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">দেরি: {late}</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Leave balance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs"><Calendar className="h-4 w-4" /> ছুটির ব্যালেন্স</div>
            <p className="text-2xl font-bold mt-1">{leaveLeft} দিন</p>
            <p className="text-xs text-muted-foreground mt-2">সব leave type মিলে অবশিষ্ট</p>
          </CardContent>
        </Card>
      </div>

      {/* Extra widgets if admin granted any */}
      {widgetPermissions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">সিস্টেম ওভারভিউ</p>
            <p className="text-xs text-muted-foreground">
              অ্যাডমিন আপনাকে {widgetPermissions.length}টি widget এর অ্যাক্সেস দিয়েছেন। (UI শীঘ্রই)
            </p>
          </CardContent>
        </Card>
      )}

      {extraRoleNames.length > 0 && (
        <p className="text-xs text-muted-foreground">
          অতিরিক্ত role: {extraRoleNames.join(", ")} — sidebar এ সংশ্লিষ্ট menu দেখা যাবে।
        </p>
      )}
    </div>
  );
}
