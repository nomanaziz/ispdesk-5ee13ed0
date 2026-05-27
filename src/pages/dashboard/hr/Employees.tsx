import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Edit, Eye, DollarSign, Calendar, Users, Receipt, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import EmployeePayheadsDialog from "@/components/hr/EmployeePayheadsDialog";
import EmployeeHolidaysDialog from "@/components/hr/EmployeeHolidaysDialog";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payheadEmp, setPayheadEmp] = useState<any | null>(null);
  const [holidayEmp, setHolidayEmp] = useState<any | null>(null);
  const [confirmEmp, setConfirmEmp] = useState<any | null>(null);
  const [confirmSalary, setConfirmSalary] = useState<string>("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(name), positions(name)")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").eq("status", "active").order("name");
      return data || [];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("employees").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const confirmEmployee = useMutation({
    mutationFn: async () => {
      if (!confirmEmp) return;
      const { error } = await supabase.rpc("confirm_employee" as any, {
        _employee_id: confirmEmp.id,
        _confirm_date: new Date().toISOString().slice(0, 10),
        _new_salary: confirmSalary ? Number(confirmSalary) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Confirmation সম্পন্ন — leave balance auto-create হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setConfirmEmp(null);
      setConfirmSalary("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (employees || [])
    .filter((e: any) => statusFilter === "all" || e.status === statusFilter)
    .filter((e: any) => deptFilter === "all" || e.department_id === deptFilter)
    .filter((e: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return e.name?.toLowerCase().includes(s) || e.employee_id?.toLowerCase().includes(s) || e.phone?.toLowerCase().includes(s);
    });

  const allSelected = filtered.length > 0 && filtered.every((e: any) => selected.has(e.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((e: any) => e.id)));
  };
  const toggleOne = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };

  const goGenerate = () => {
    const ids = Array.from(selected);
    const qs = ids.length ? `?ids=${ids.join(",")}` : "";
    navigate(`/dashboard/hr/payslip${qs}`);
  };

  const activeCount = (employees || []).filter((e: any) => e.status === "active").length;
  const inactiveCount = (employees || []).filter((e: any) => e.status === "inactive").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">কর্মী তালিকা</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — কর্মী ম্যানেজমেন্ট</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={selected.size === 0} onClick={goGenerate} className="gap-2">
            <Receipt className="h-4 w-4" /> পে-স্লিপ জেনারেট {selected.size > 0 && `(${selected.size})`}
          </Button>
          <Button onClick={() => navigate("/dashboard/hr/employees/add")} className="gap-2">
            <Plus className="h-4 w-4" /> নতুন কর্মী যোগ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{activeCount}</p><p className="text-xs text-muted-foreground">সক্রিয় কর্মী</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{inactiveCount}</p><p className="text-xs text-muted-foreground">নিষ্ক্রিয় কর্মী</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{(employees || []).length}</p><p className="text-xs text-muted-foreground">মোট কর্মী</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{(departments || []).length}</p><p className="text-xs text-muted-foreground">ডিপার্টমেন্ট</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant={statusFilter === "active" ? "default" : "outline"} onClick={() => setStatusFilter("active")}>সক্রিয়</Button>
        <Button size="sm" variant={statusFilter === "inactive" ? "default" : "outline"} onClick={() => setStatusFilter("inactive")}>নিষ্ক্রিয়</Button>
        <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>সব</Button>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="ডিপার্টমেন্ট" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল ডিপার্টমেন্ট</SelectItem>
            {(departments || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative w-64 ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="অনুসন্ধান..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" /> কর্মী তালিকা <Badge variant="secondary">{filtered.length}</Badge>
            {selected.size > 0 && <Badge>{selected.size} নির্বাচিত</Badge>}
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
                    <TableHead className="w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead>নাম</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>মোবাইল</TableHead>
                    <TableHead>অফিস ফোন</TableHead>
                    <TableHead>ডিপার্টমেন্ট</TableHead>
                    <TableHead>পদবী</TableHead>
                    <TableHead>বেতন</TableHead>
                    <TableHead>প্রবেশন</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">কোনো কর্মী পাওয়া যায়নি</TableCell></TableRow>
                  )}
                  {filtered.map((emp: any) => (
                    <TableRow key={emp.id} className={selected.has(emp.id) ? "bg-muted/30" : ""}>
                      <TableCell>
                        <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggleOne(emp.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="font-mono">{emp.employee_id}</TableCell>
                      <TableCell>{emp.phone || emp.personal_phone || "—"}</TableCell>
                      <TableCell>{emp.office_phone || "—"}</TableCell>
                      <TableCell>{emp.departments?.name || "—"}</TableCell>
                      <TableCell>{emp.positions?.name || "—"}</TableCell>
                      <TableCell>৳{Number(emp.salary || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        {emp.is_confirmed ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Confirmed
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Probation
                            {emp.probation_end_date ? ` → ${emp.probation_end_date}` : ""}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={emp.status === "active"}
                          onCheckedChange={(checked) => toggleStatus.mutate({ id: emp.id, status: checked ? "active" : "inactive" })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!emp.is_confirmed && (
                            <Button size="icon" variant="ghost" title="Confirm করুন"
                              onClick={() => { setConfirmEmp(emp); setConfirmSalary(String(emp.salary || 0)); }}>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="দেখুন"
                            onClick={() => navigate(`/dashboard/hr/employees/${emp.id}`)}>
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button size="icon" variant="ghost" title="এডিট"
                            onClick={() => navigate(`/dashboard/hr/employees/add?edit=${emp.id}`)}>
                            <Edit className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" title="পে-হেডস" onClick={() => setPayheadEmp(emp)}>
                            <DollarSign className="h-4 w-4 text-amber-600" />
                          </Button>
                          <Button size="icon" variant="ghost" title="সাপ্তাহিক ছুটি" onClick={() => setHolidayEmp(emp)}>
                            <Calendar className="h-4 w-4 text-indigo-600" />
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

      <EmployeePayheadsDialog employee={payheadEmp} onClose={() => setPayheadEmp(null)} />
      <EmployeeHolidaysDialog employee={holidayEmp} onClose={() => setHolidayEmp(null)} />
    </div>
  );
}
