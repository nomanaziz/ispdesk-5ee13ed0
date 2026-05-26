import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Receipt, RefreshCw, Eye, FileText, Search, Edit2, Printer } from "lucide-react";
import { computeForEmployee, periodLabel, monthToDate, type ComputedPayroll } from "@/lib/payrollCompute";

const currentMonth = new Date().toISOString().slice(0, 7);

type FilterMode = "all" | "regular" | "bonus" | "less";

export default function PayslipManager() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [month, setMonth] = useState(currentMonth);
  const [empType, setEmpType] = useState<string>("active");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editEmp, setEditEmp] = useState<any | null>(null);
  const [editLines, setEditLines] = useState<any[]>([]);

  // Pre-select from URL ?ids=
  useEffect(() => {
    const ids = params.get("ids");
    if (ids) setSelected(new Set(ids.split(",")));
  }, [params]);

  // Employees
  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ["employees-payslip"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name), positions(name), payroll_templates(name, payroll_type)")
        .order("name");
      return data || [];
    },
  });

  // Existing payroll rows for the selected month
  const monthDate = monthToDate(month);
  const { data: existing, refetch: refetchExisting } = useQuery({
    queryKey: ["payroll-month", month],
    queryFn: async () => {
      const { data } = await supabase.from("payroll").select("*").eq("month", monthDate);
      return data || [];
    },
  });

  const existingByEmp = useMemo(() => {
    const m = new Map<string, any>();
    (existing || []).forEach((p: any) => m.set(p.employee_id, p));
    return m;
  }, [existing]);

  // Active payheads (active list — used in edit dialog)
  const { data: allPayheads } = useQuery({
    queryKey: ["payheads-all-active"],
    queryFn: async () => {
      const { data } = await supabase.from("payheads").select("*").eq("status", "active");
      return data || [];
    },
  });

  // Compute totals per employee (template-based) for display
  const [computed, setComputed] = useState<Record<string, ComputedPayroll>>({});
  useEffect(() => {
    if (!employees) return;
    (async () => {
      const map: Record<string, ComputedPayroll> = {};
      for (const e of employees as any[]) {
        const ex = existingByEmp.get(e.id);
        const overrides = ex?.adjustments && Array.isArray(ex.adjustments) ? ex.adjustments : [];
        map[e.id] = await computeForEmployee(e, overrides);
      }
      setComputed(map);
    })();
  }, [employees, existingByEmp]);

  // Filtering
  const filtered = (employees || [])
    .filter((e: any) => {
      if (empType === "all") return true;
      if (empType === "left") return e.status === "inactive" || e.status === "resigned" || e.status === "terminated";
      return e.status === "active";
    })
    .filter((e: any) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return e.name?.toLowerCase().includes(s) || e.employee_id?.toLowerCase().includes(s);
    })
    .filter((e: any) => {
      if (filterMode === "all") return true;
      const c = computed[e.id];
      const ex = existingByEmp.get(e.id);
      if (!c || !ex) return filterMode === "all";
      const tpl = c.basic_salary + c.total_allowance - c.total_deduction;
      const net = Number(ex.net_salary || 0);
      if (filterMode === "regular") return Math.abs(net - tpl) < 1;
      if (filterMode === "bonus") return net > tpl + 0.5;
      if (filterMode === "less") return net < tpl - 0.5;
      return true;
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

  // --- Generate / Regenerate ---
  const persistPayroll = async (emp: any, overrides: any[], { regenerate = false }: { regenerate?: boolean } = {}) => {
    const c = await computeForEmployee(emp, overrides);
    const payload: any = {
      employee_id: emp.id,
      month: monthDate,
      basic_salary: c.basic_salary,
      total_allowance: c.total_allowance,
      total_deduction: c.total_deduction,
      net_salary: c.net_salary,
      status: "unpaid",
      adjustments: overrides,
      period_label: periodLabel(month),
      generated_at: new Date().toISOString(),
    };
    const ex = existingByEmp.get(emp.id);
    if (ex && !regenerate) return { skipped: true };
    if (ex) {
      const { error } = await supabase.from("payroll").update(payload).eq("id", ex.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("payroll").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  };

  const handleGenerate = async (mode: "generate" | "regenerate") => {
    if (selected.size === 0) {
      toast.error("কাউকে নির্বাচন করুন");
      return;
    }
    const ids = Array.from(selected);
    let ok = 0, skipped = 0;
    for (const id of ids) {
      const emp = (employees || []).find((e: any) => e.id === id);
      if (!emp) continue;
      const ex = existingByEmp.get(id);
      const overrides = ex?.adjustments && Array.isArray(ex.adjustments) ? ex.adjustments : [];
      try {
        const r = await persistPayroll(emp, overrides, { regenerate: mode === "regenerate" });
        if (r.skipped) skipped++;
        else ok++;
      } catch (e: any) {
        toast.error(`${emp.name}: ${e.message}`);
      }
    }
    await refetchExisting();
    qc.invalidateQueries({ queryKey: ["payroll-month"] });
    toast.success(`${ok} জনের পে-স্লিপ ${mode === "regenerate" ? "পুনঃ" : ""}জেনারেট হয়েছে${skipped ? ` (${skipped} আগে থেকেই ছিল)` : ""}`);
  };

  // --- Edit payheads (override per month) ---
  const openEdit = (emp: any) => {
    setEditEmp(emp);
    const ex = existingByEmp.get(emp.id);
    const overrides = ex?.adjustments && Array.isArray(ex.adjustments) ? ex.adjustments : [];
    const c = computed[emp.id];
    if (!c) return;
    const lines = c.lines.map((l) => {
      const ov = overrides.find((o: any) => o.payhead_id === l.payhead_id);
      return { ...l, amount: ov ? Number(ov.amount) : l.amount };
    });
    setEditLines(lines);
  };

  const saveEdit = async () => {
    if (!editEmp) return;
    const overrides = editLines.map((l) => ({ payhead_id: l.payhead_id, amount: Number(l.amount) }));
    try {
      await persistPayroll(editEmp, overrides, { regenerate: true });
      toast.success("সংরক্ষিত");
      setEditEmp(null);
      await refetchExisting();
    } catch (e: any) { toast.error(e.message); }
  };

  // --- Mark paid ---
  const markPaid = async (id: string) => {
    const { error } = await supabase.from("payroll").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("পরিশোধিত হিসেবে চিহ্নিত");
    refetchExisting();
  };

  const preview = previewId ? (existing || []).find((p: any) => p.id === previewId) : null;
  const previewEmp = preview ? (employees || []).find((e: any) => e.id === preview.employee_id) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">পে-স্লিপ ম্যানেজার</h1>
          <p className="text-sm text-muted-foreground">HR & Payroll — পে-স্লিপ জেনারেট ও ম্যানেজমেন্ট</p>
        </div>
        <Button variant="link" onClick={() => navigate("/dashboard/hr/payroll")}>View Rules »</Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">মাস</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Employee Type</label>
            <Select value={empType} onValueChange={setEmpType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <label className="text-xs text-muted-foreground block mb-1">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="কর্মী খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
            </div>
          </div>
          <div className="flex-1" />
          <Button onClick={() => handleGenerate("generate")} className="gap-2 bg-green-600 hover:bg-green-700">
            <Receipt className="h-4 w-4" /> Generate
          </Button>
          <Button variant="secondary" disabled={selected.size === 0} onClick={() => {
            const firstId = Array.from(selected)[0];
            const ex = (existing || []).find((p: any) => p.employee_id === firstId);
            if (ex) setPreviewId(ex.id);
            else toast.error("আগে পে-স্লিপ জেনারেট করুন");
          }} className="gap-2">
            <Eye className="h-4 w-4" /> View
          </Button>
          <Button variant="outline" onClick={() => handleGenerate("regenerate")} className="gap-2 text-orange-600">
            <RefreshCw className="h-4 w-4" /> Regenerate
          </Button>
        </CardContent>
      </Card>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "regular", "bonus", "less"] as FilterMode[]).map((m) => (
          <Button key={m} size="sm" variant={filterMode === m ? "default" : "outline"} onClick={() => setFilterMode(m)}>
            {m === "all" ? "সব" : m === "regular" ? "নিয়মিত" : m === "bonus" ? "অতিরিক্ত / বোনাস" : "কম"}
          </Button>
        ))}
      </div>

      {/* Employee list */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center gap-3">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <CardTitle className="text-base">Select All Employee <Badge variant="secondary">{filtered.length}</Badge>{selected.size > 0 && <Badge className="ml-2">{selected.size} নির্বাচিত</Badge>}</CardTitle>
        </CardHeader>
        <CardContent>
          {empLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="divide-y">
              {filtered.map((emp: any) => {
                const c = computed[emp.id];
                const ex = existingByEmp.get(emp.id);
                const tplName = emp.payroll_templates?.name || "—";
                const tplType = emp.payroll_templates?.payroll_type || "Monthly";
                const total = ex ? Number(ex.net_salary) : (c ? c.net_salary : 0);
                const tplTotal = c ? c.net_salary : 0;
                const diff = ex && c ? Number(ex.net_salary) - tplTotal : 0;
                return (
                  <div key={emp.id} className="py-3 flex flex-wrap items-center gap-4">
                    <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggleOne(emp.id)} />
                    <div className="min-w-[160px]">
                      <p className="font-medium">{emp.name}</p>
                      <button className="text-xs text-blue-600 hover:underline"
                        onClick={() => navigate(`/dashboard/hr/employees/${emp.id}`)}>
                        View More... »
                      </button>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs text-muted-foreground">পেরোল টেমপ্লেট</div>
                      <div className="bg-muted/40 rounded px-3 py-1.5 min-w-[200px]">
                        {periodLabel(month)} ({tplName})
                      </div>
                    </div>
                    <div className="text-sm flex-1 min-w-[200px]">
                      <p className="text-muted-foreground">
                        Generate Payslip for: <span className="text-pink-600 font-medium">{periodLabel(month)}</span>
                      </p>
                      <p className="text-blue-600">
                        --» {emp.positions?.name || "—"} <span className="text-muted-foreground">({tplType} Payroll)</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(emp)} title="এডিট পে-হেডস">
                        <Edit2 className="h-4 w-4 text-amber-600" />
                      </Button>
                      <div className="text-right min-w-[140px]">
                        <p className="text-xs text-muted-foreground">Payheads Total</p>
                        <p className="font-bold">
                          ৳{total.toLocaleString()}
                          {diff !== 0 && (
                            <span className={`text-xs ml-1 ${diff > 0 ? "text-green-600" : "text-destructive"}`}>
                              ({diff > 0 ? "+" : ""}{diff})
                            </span>
                          )}
                        </p>
                      </div>
                      {ex && (
                        <>
                          <Badge
                            variant={ex.status === "paid" ? "default" : "outline"}
                            className={ex.status === "paid" ? "bg-green-600" : ""}>
                            {ex.status === "paid" ? "Fully Paid" : "Unpaid"}
                          </Badge>
                          <Button size="icon" variant="ghost" onClick={() => setPreviewId(ex.id)}>
                            <FileText className="h-4 w-4 text-blue-600" />
                          </Button>
                          {ex.status !== "paid" && (
                            <Button size="sm" variant="default" onClick={() => markPaid(ex.id)}>Pay</Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">কর্মী পাওয়া যায়নি</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payheads dialog */}
      <Dialog open={!!editEmp} onOpenChange={(o) => !o && setEditEmp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editEmp?.name} — {periodLabel(month)} পে-হেডস এডিট</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              মূল বেতন: ৳{Number(editEmp?.salary || 0).toLocaleString()} • শুধু এই মাসের জন্য পরিবর্তন save হবে।
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PayHead</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead className="text-right">টেমপ্লেট</TableHead>
                  <TableHead className="text-right">এই মাসের পরিমাণ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editLines.map((l, i) => (
                  <TableRow key={l.payhead_id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>
                      <Badge variant={l.type === "deduction" ? "destructive" : "default"}>
                        {l.type === "deduction" ? "কর্তন" : "ভাতা"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">৳{l.base_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={l.amount} className="w-28 ml-auto"
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setEditLines((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: v } : x));
                        }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmp(null)}>বাতিল</Button>
            <Button onClick={saveEdit}>সংরক্ষণ ও জেনারেট</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewId} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> পে-স্লিপ — {preview?.period_label}</DialogTitle>
          </DialogHeader>
          {preview && previewEmp && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">নাম:</span> <strong>{previewEmp.name}</strong></div>
                <div><span className="text-muted-foreground">আইডি:</span> <strong>{previewEmp.employee_id}</strong></div>
                <div><span className="text-muted-foreground">ডিপার্টমেন্ট:</span> {previewEmp.departments?.name || "—"}</div>
                <div><span className="text-muted-foreground">পদবী:</span> {previewEmp.positions?.name || "—"}</div>
              </div>
              <div className="border-t pt-2 space-y-1">
                <Row label="মূল বেতন" value={`৳${Number(preview.basic_salary).toLocaleString()}`} />
                <Row label="মোট ভাতা" value={`৳${Number(preview.total_allowance).toLocaleString()}`} positive />
                <Row label="মোট কর্তন" value={`৳${Number(preview.total_deduction).toLocaleString()}`} negative />
              </div>
              <div className="bg-muted/40 rounded p-3 flex justify-between text-lg font-bold">
                <span>নেট বেতন</span>
                <span className="text-primary">৳{Number(preview.net_salary).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <Badge variant={preview.status === "paid" ? "default" : "secondary"} className={preview.status === "paid" ? "bg-green-600" : ""}>
                  {preview.status === "paid" ? "পরিশোধিত" : "অপরিশোধিত"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1"><Printer className="h-4 w-4" /> প্রিন্ট</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between ${positive ? "text-green-600" : negative ? "text-destructive" : ""}`}>
      <span>{label}</span><span className="font-medium">{value}</span>
    </div>
  );
}
