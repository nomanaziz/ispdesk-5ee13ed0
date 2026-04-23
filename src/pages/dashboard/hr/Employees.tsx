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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("কর্মী মুছে ফেলা হয়েছে");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
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

  const filtered = (employees || [])
    .filter((e: any) => e.status === statusFilter)
    .filter((e: any) => deptFilter === "all" || e.department_id === deptFilter)
    .filter((e: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return e.name?.toLowerCase().includes(s) || e.employee_id?.toLowerCase().includes(s) || e.phone?.toLowerCase().includes(s);
    });

  const activeCount = (employees || []).filter((e: any) => e.status === "active").length;
  const inactiveCount = (employees || []).filter((e: any) => e.status === "inactive").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">কর্মী তালিকা</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — কর্মী ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={() => navigate("/dashboard/hr/employees/add")} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন কর্মী যোগ
        </Button>
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
        <SearchableSelect
          value={deptFilter}
          onValueChange={setDeptFilter}
          options={[
            { value: "all", label: "সকল ডিপার্টমেন্ট" },
            ...((departments || []).map((d: any) => ({ value: d.id, label: d.name }))),
          ]}
          placeholder="ডিপার্টমেন্ট"
          className="w-48"
        />
        <div className="relative w-64 ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="অনুসন্ধান..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> কর্মী তালিকা <Badge variant="secondary">{filtered.length}</Badge></CardTitle>
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
                    <TableHead>পদবী</TableHead>
                    <TableHead>ফোন</TableHead>
                    <TableHead>বেতন</TableHead>
                    <TableHead>যোগদানের তারিখ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">কোনো কর্মী পাওয়া যায়নি</TableCell></TableRow>
                  )}
                  {filtered.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono">{emp.employee_id}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.departments?.name || "—"}</TableCell>
                      <TableCell>{emp.positions?.name || "—"}</TableCell>
                      <TableCell>{emp.phone || "—"}</TableCell>
                      <TableCell>৳{emp.salary?.toLocaleString() || 0}</TableCell>
                      <TableCell>{emp.joining_date || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={emp.status === "active"}
                          onCheckedChange={(checked) => toggleStatus.mutate({ id: emp.id, status: checked ? "active" : "inactive" })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/hr/employees/add?edit=${emp.id}`)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(emp.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>কর্মী মুছে ফেলুন</DialogTitle>
            <DialogDescription>আপনি কি নিশ্চিত? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>মুছে ফেলুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
