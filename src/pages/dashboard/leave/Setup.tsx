import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, RefreshCw } from "lucide-react";

export default function Setup() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, name, employee_id").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["leave-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_categories").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["leave-balances", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*, employees(name, employee_id), leave_categories(name)")
        .eq("year", parseInt(year))
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const bulkAllocateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) throw new Error("কর্মী নির্বাচন করুন");
      const rows = categories.map((cat) => ({
        employee_id: selectedEmployee,
        category_id: cat.id,
        year: parseInt(year),
        total_days: parseInt(allocations[cat.id] || String(cat.days_allowed ?? 0)),
        used_days: 0,
        remaining_days: parseInt(allocations[cat.id] || String(cat.days_allowed ?? 0)),
      }));
      const { error } = await supabase.from("leave_balances").upsert(rows, { onConflict: "employee_id,category_id,year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("লিভ ব্যালেন্স বরাদ্দ হয়েছে");
      setDialogOpen(false);
      setSelectedEmployee("");
      setAllocations({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAllMutation = useMutation({
    mutationFn: async () => {
      const rows = employees.flatMap((emp) =>
        categories.map((cat) => ({
          employee_id: emp.id,
          category_id: cat.id,
          year: parseInt(year),
          total_days: cat.days_allowed ?? 0,
          used_days: 0,
          remaining_days: cat.days_allowed ?? 0,
        }))
      );
      const { error } = await supabase.from("leave_balances").upsert(rows, { onConflict: "employee_id,category_id,year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("সকল কর্মীর লিভ ব্যালেন্স বরাদ্দ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openDialog = () => {
    const init: Record<string, string> = {};
    categories.forEach((c) => { init[c.id] = String(c.days_allowed ?? 0); });
    setAllocations(init);
    setSelectedEmployee("");
    setDialogOpen(true);
  };

  // Group balances by employee
  const grouped = balances.reduce((acc: Record<string, any[]>, b: any) => {
    const empName = b.employees?.name || "Unknown";
    if (!acc[empName]) acc[empName] = [];
    acc[empName].push(b);
    return acc;
  }, {});

  const filteredEntries = Object.entries(grouped).filter(([name]) => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">লিভ সেটআপ — বার্ষিক বরাদ্দ</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => bulkAllMutation.mutate()} disabled={bulkAllMutation.isPending}>
            <RefreshCw className="h-4 w-4 mr-1" /> সকল কর্মী বরাদ্দ
          </Button>
          <Button onClick={openDialog} size="sm"><Plus className="h-4 w-4 mr-1" /> একক বরাদ্দ</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="কর্মী সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>কর্মী</TableHead>
              {categories.map((c) => <TableHead key={c.id} className="text-center">{c.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={categories.length + 1} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow><TableCell colSpan={categories.length + 1} className="text-center py-8 text-muted-foreground">কোনো ডাটা পাওয়া যায়নি। উপরে "সকল কর্মী বরাদ্দ" চাপুন।</TableCell></TableRow>
            ) : filteredEntries.map(([name, bals]) => (
              <TableRow key={name}>
                <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
                {categories.map((cat) => {
                  const b = (bals as any[]).find((x: any) => x.category_id === cat.id);
                  return (
                    <TableCell key={cat.id} className="text-center">
                      {b ? (
                        <span className="text-xs">
                          <Badge variant="outline" className="mr-1">{b.remaining_days}/{b.total_days}</Badge>
                          <span className="text-muted-foreground">ব্যবহৃত: {b.used_days}</span>
                        </span>
                      ) : "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>একক কর্মী লিভ বরাদ্দ — {year}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>কর্মী নির্বাচন *</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="কর্মী বাছুন" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <Label className="min-w-[120px]">{cat.name}</Label>
                <Input type="number" className="w-20" value={allocations[cat.id] || "0"} onChange={(e) => setAllocations({ ...allocations, [cat.id]: e.target.value })} />
                <span className="text-xs text-muted-foreground">দিন</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => bulkAllocateMutation.mutate()} disabled={!selectedEmployee || bulkAllocateMutation.isPending}>
              {bulkAllocateMutation.isPending ? "সেভ হচ্ছে..." : "বরাদ্দ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
