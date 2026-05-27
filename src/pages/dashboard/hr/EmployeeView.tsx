import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, MapPin, GraduationCap, Briefcase, Calendar, DollarSign, Edit, UserPlus } from "lucide-react";
import { periodLabel } from "@/lib/payrollCompute";
import EmployeeFacilitiesTab from "@/components/hr/EmployeeFacilitiesTab";
import ConvertToAppUserDialog from "@/components/hr/ConvertToAppUserDialog";
import { useState } from "react";


export default function EmployeeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [convertOpen, setConvertOpen] = useState(false);



  const { data: emp, isLoading } = useQuery({
    queryKey: ["employee-view", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name), positions(name), branches(name), payroll_templates(name, payroll_type)")
        .eq("id", id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: payrolls } = useQuery({
    queryKey: ["employee-payrolls", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", id!)
        .order("month", { ascending: false });
      return data || [];
    },
  });

  const { data: shifts } = useQuery({
    queryKey: ["emp-shift-info", emp?.default_shift_id],
    enabled: !!emp?.default_shift_id,
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*").eq("id", emp.default_shift_id).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (!emp) return <div className="text-center p-12">কর্মী পাওয়া যায়নি</div>;

  const totalGenerated = (payrolls || []).reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const totalPaid = (payrolls || []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const totalDue = totalGenerated - totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/hr/employees")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> ফিরে যান
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{emp.name}</h1>
          <p className="text-sm text-muted-foreground">{emp.employee_id} • {emp.departments?.name} • {emp.positions?.name}</p>
        </div>
        <Button variant="outline" onClick={() => setConvertOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> App User বানান
        </Button>
        <Button onClick={() => navigate(`/dashboard/hr/employees/add?edit=${emp.id}`)} className="gap-2">
          <Edit className="h-4 w-4" /> এডিট

        </Button>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-32 h-32 rounded-lg bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
              {emp.image_url ? (
                <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <Row icon={<User />} label="কর্মী আইডি" value={emp.employee_id} />
              <Row icon={<Briefcase />} label="পদবী" value={emp.positions?.name} />
              <Row icon={<Phone />} label="ফোন" value={emp.phone || emp.personal_phone} />
              <Row icon={<Mail />} label="ইমেইল" value={emp.email} />
              <Row icon={<Calendar />} label="যোগদানের তারিখ" value={emp.joining_date} />
              <Row icon={<Calendar />} label="জন্ম তারিখ" value={emp.date_of_birth} />
              <Row icon={<MapPin />} label="ঠিকানা" value={emp.address} />
              <Row icon={<GraduationCap />} label="শিক্ষা" value={emp.last_degree} />
              <Row icon={<DollarSign />} label="মূল বেতন" value={emp.salary ? `৳${Number(emp.salary).toLocaleString()}` : "—"} />
              <Row icon={<Briefcase />} label="স্ট্যাটাস" value={
                <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                  {emp.status === "active" ? "সক্রিয়" : emp.status}
                </Badge>
              } />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="মোট জেনারেটেড" value={`৳${totalGenerated.toLocaleString()}`} color="text-foreground" />
        <StatCard label="মোট পরিশোধিত" value={`৳${totalPaid.toLocaleString()}`} color="text-green-600" />
        <StatCard label="মোট বকেয়া" value={`৳${totalDue.toLocaleString()}`} color="text-destructive" />
        <StatCard label="পেরোল টেমপ্লেট" value={emp.payroll_templates?.name || "—"} small />
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">বেতন ইতিহাস</TabsTrigger>
          <TabsTrigger value="personal">ব্যক্তিগত তথ্য</TabsTrigger>
          <TabsTrigger value="shift">শিফট / কর্মঘণ্টা</TabsTrigger>
          <TabsTrigger value="facilities">সুবিধা</TabsTrigger>
        </TabsList>

        <TabsContent value="facilities" className="mt-4">
          {id && <EmployeeFacilitiesTab employeeId={id} />}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">পে-স্লিপ টাইমলাইন ({(payrolls || []).length})</CardTitle></CardHeader>
            <CardContent>
              {(payrolls || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">এখনো কোনো পে-স্লিপ জেনারেট করা হয়নি</p>
              ) : (
                <div className="space-y-2">
                  {(payrolls || []).map((p: any) => {
                    const paid = Number(p.paid_amount || 0);
                    const payable = Number(p.net_salary || 0);
                    const due = Math.max(0, payable - paid);
                    const pStatus = p.payment_status || p.status;
                    const isPaid = pStatus === "paid";
                    const isPartial = pStatus === "partial" || (paid > 0 && due > 0);
                    const label = p.period_label || periodLabel(p.month);
                    return (
                      <div key={p.id} className="flex items-center justify-between border rounded p-3 gap-3 flex-wrap">
                        <div className="flex-1 min-w-[140px]">
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            জেনারেট: {new Date(p.generated_at || p.created_at).toLocaleDateString("bn-BD")}
                          </p>
                        </div>
                        <div>
                          <Badge
                            className={isPaid ? "bg-green-600 hover:bg-green-700" : isPartial ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" : ""}
                            variant={isPaid ? "default" : "outline"}
                          >
                            {isPaid ? `Fully Paid: ৳${payable.toLocaleString()}` : isPartial ? `Partially Paid: ৳${paid.toLocaleString()} / ৳${payable.toLocaleString()}` : `Unpaid: ৳${payable.toLocaleString()}`}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          পরিশোধিত: ৳{paid.toLocaleString()} • বকেয়া: ৳{due.toLocaleString()} • ভাতা: ৳{Number(p.total_allowance || 0).toLocaleString()} • কর্তন: ৳{Number(p.total_deduction || 0).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <Row label="লিঙ্গ" value={emp.gender} />
              <Row label="বৈবাহিক অবস্থা" value={emp.marital_status} />
              <Row label="এনআইডি" value={emp.nid_number} />
              <Row label="অভিভাবকের ফোন" value={emp.guardian_phone} />
              <Row label="রেফারেন্স" value={emp.reference} />
              <Row label="জেলা" value={emp.district} />
              <Row label="উপজেলা" value={emp.upazila} />
              <Row label="স্থায়ী ঠিকানা" value={emp.permanent_address} />
              <Row label="শেষ ডিগ্রি" value={emp.last_degree} />
              <Row label="প্রতিষ্ঠান" value={emp.institution} />
              <Row label="পাশের বছর" value={emp.passing_year} />
              <Row label="অভিজ্ঞতা" value={emp.working_experience} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shift" className="mt-4">
          <Card>
            <CardContent className="p-6 space-y-2 text-sm">
              {shifts ? (
                <>
                  <Row label="শিফট নাম" value={shifts.name} />
                  <Row label="শুরু" value={shifts.start_time} />
                  <Row label="শেষ" value={shifts.end_time} />
                  <Row label="গ্রেস (মিনিট)" value={shifts.grace_minutes?.toString()} />
                </>
              ) : (
                <p className="text-muted-foreground text-center">কোনো শিফট assign করা নেই</p>
              )}
              <Row label="ডিফল্ট ইন টাইম" value={emp.default_in_time} />
              <Row label="ডিফল্ট আউট টাইম" value={emp.default_out_time} />
              <Row label="পাঞ্চ কার্ড ID" value={emp.punch_card_id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <ConvertToAppUserDialog
        employee={emp ? { id: emp.id, name: emp.name, employee_id: emp.employee_id } : null}
        open={convertOpen}
        onOpenChange={setConvertOpen}
      />
    </div>
  );
}


function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: any }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-muted-foreground mt-0.5 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <div className="flex-1">
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value || "—"}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, small }: { label: string; value: string; color?: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`${small ? "text-base" : "text-xl"} font-bold mt-1 ${color || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
