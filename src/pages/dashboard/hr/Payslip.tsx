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
import { Receipt, RefreshCw, Eye, FileText, Search, Edit2, Printer, Download, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { computeForEmployee, periodLabel, monthToDate, type ComputedPayroll } from "@/lib/payrollCompute";
import { getDeductionsForEmployee, applyDeductions, reverseDeductions } from "@/lib/payrollDeductions";
import PayslipPaymentDialog from "@/components/hr/PayslipPaymentDialog";
import PayslipPrintView from "@/components/hr/PayslipPrintView";

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
  const [showRules, setShowRules] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editEmp, setEditEmp] = useState<any | null>(null);
  const [editLines, setEditLines] = useState<any[]>([]);
  const [payDialog, setPayDialog] = useState<any | null>(null);
  const [bulkPreview, setBulkPreview] = useState<string[] | null>(null);

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
      if (!c || !ex) return false;
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
    const ex = existingByEmp.get(emp.id);
    if (ex && !regenerate) return { skipped: true };

    // reverse old deductions if regenerating
    if (ex && regenerate) {
      await reverseDeductions(ex.id, month);
    }

    const ded = await getDeductionsForEmployee(emp.id, month);

    // Cap deductions so net salary never goes negative — remaining balance
    // carries forward to the next month automatically (loan remaining_balance
    // is reduced only by the capped installment).
    const available = Math.max(0, c.net_salary);
    let loanDed = Math.min(ded.loan_deduction, available);
    let advDed = Math.min(ded.advance_deduction, available - loanDed);

    // Reflect cap back into the deduction record so applyDeductions writes
    // the correct installment + leaves the rest in remaining_balance.
    const cappedDed = {
      ...ded,
      loan_deduction: loanDed,
      advance_deduction: advDed,
      installment_amount: ded.active_loan_id ? loanDed : ded.installment_amount,
    };

    // If the loan installment got capped to 0 (no salary left), don't record
    // a 0-amount installment row at all.
    if (cappedDed.installment_amount === 0) {
      cappedDed.active_loan_id = undefined;
      cappedDed.installment_amount = undefined;
    }
    // Same for advances — only mark as adjusted if we actually deducted them.
    if (advDed < ded.advance_deduction) {
      cappedDed.advance_ids = [];
    }

    const netAfter = c.net_salary - loanDed - advDed;

    const payload: any = {
      employee_id: emp.id,
      month: monthDate,
      basic_salary: c.basic_salary,
      total_allowance: c.total_allowance,
      total_deduction: c.total_deduction,
      net_salary: netAfter,
      loan_deduction: loanDed,
      advance_deduction: advDed,
      status: "unpaid",
      payment_status: "unpaid",
      paid_amount: 0,
      adjustments: overrides,
      period_label: periodLabel(month),
      generated_at: new Date().toISOString(),
    };

    let payrollId = ex?.id;
    if (ex) {
      const { error } = await supabase.from("payroll").update(payload).eq("id", ex.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("payroll").insert(payload).select("id").single();
      if (error) throw error;
      payrollId = data.id;
    }

    if (payrollId) await applyDeductions(payrollId, month, cappedDed);
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
  const openEdit = async (emp: any) => {
    setEditEmp(emp);
    const ex = existingByEmp.get(emp.id);
    const overrides = ex?.adjustments && Array.isArray(ex.adjustments) ? ex.adjustments : [];
    const c = computed[emp.id];
    if (!c) return;

    // Prepend the Basic Salary line as editable
    const { data: basicPh } = await supabase
      .from("payheads")
      .select("id,name,type")
      .ilike("name", "basic salary")
      .limit(1)
      .maybeSingle();

    const lines: any[] = [];
    if (basicPh) {
      lines.push({
        payhead_id: (basicPh as any).id,
        name: "Basic Salary",
        type: "allowance",
        amount_type: "amount",
        base_amount: c.basic_salary,
        amount: c.basic_salary,
        is_basic: true,
      });
    }
    for (const l of c.lines) {
      const ov = overrides.find((o: any) => o.payhead_id === l.payhead_id);
      lines.push({ ...l, amount: ov ? Number(ov.amount) : l.amount });
    }
    setEditLines(lines);
  };

  const addExtraLine = (phId: string) => {
    const ph = (allPayheads || []).find((p: any) => p.id === phId);
    if (!ph) return;
    if (editLines.find((l) => l.payhead_id === phId)) {
      toast.error("ইতিমধ্যে যোগ করা আছে");
      return;
    }
    setEditLines((prev) => [
      ...prev,
      {
        payhead_id: ph.id,
        name: ph.name,
        type: ph.type === "deduction" ? "deduction" : "allowance",
        amount_type: "amount",
        base_amount: 0,
        amount: 0,
        is_manual: true,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setEditLines((prev) => prev.filter((l) => l.payhead_id !== id));
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
        <div className="flex gap-2">
          <Button variant="link" onClick={() => setShowRules((s) => !s)}>
            {showRules ? "Hide Rules «" : "View Rules »"}
          </Button>
          <Button variant="link" onClick={() => navigate("/dashboard/hr/payroll")}>Payroll Templates »</Button>
        </div>
      </div>

      {showRules && (
        <Card>
          <CardContent className="p-4 text-sm space-y-1.5 text-foreground/90">
            <p>1. You can generate Payslip for <b>Last Not generated or Last Canceled Period</b> only.</p>
            <p>2. Only <b>Previously Generated</b> and <b>Unpaid</b> Period can be <b>Regenerate</b>.</p>
            <p>3. Generate a payslip will calculate payhead's amount from <b>current employee payheads</b>.</p>
            <p>4. Regenerate a payslip will calculate payhead's amount from <b>previously generated payheads</b> for that Period.</p>
            <p>5. Before Generate a payslip you can always go to{" "}
              <button type="button" onClick={() => navigate("/dashboard/hr/settings")} className="text-primary underline">Payslip Generation Settings</button>{" "}
              and change generate permission for the timing fees like <b>Late fee, Early out fee & Overtime fee</b>.
            </p>
            <p>6. You can <b>Cancel</b> a payslip, if that payslip is <b>not paid</b> yet.</p>
            <p>7. You can <b>Update</b> a payslip, if that payslip is paid <b>partially</b> and when you need to recalculate that payslip <b>timing fees</b> for that period. You can do this many times until that payslip is fully paid.</p>
            <p>8. If you make any mistake during selecting a period for a Generate Payslip, you can continue with the <b>Correctly Selected Employee</b>.</p>
            <p>9. All <b>Previously Generated</b> and <b>not Canceled</b> Payslip can be View.</p>
            <p>10. You can see Paid and Generated Status for each Period by clicking <b>View More</b>.</p>
          </CardContent>
        </Card>
      )}

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
            const ids = Array.from(selected);
            const payrollIds = ids
              .map((eid) => (existing || []).find((p: any) => p.employee_id === eid)?.id)
              .filter(Boolean) as string[];
            if (payrollIds.length === 0) {
              toast.error("আগে পে-স্লিপ জেনারেট করুন");
              return;
            }
            if (payrollIds.length === 1) setPreviewId(payrollIds[0]);
            else setBulkPreview(payrollIds);
          }} className="gap-2">
            <Eye className="h-4 w-4" /> View
          </Button>
          <Button variant="default" disabled={selected.size === 0} onClick={() => {
            const ids = Array.from(selected);
            const payrollIds = ids
              .map((eid) => (existing || []).find((p: any) => p.employee_id === eid)?.id)
              .filter(Boolean) as string[];
            if (payrollIds.length === 0) {
              toast.error("আগে পে-স্লিপ জেনারেট করুন");
              return;
            }
            window.open(`/dashboard/hr/payslip/print?ids=${payrollIds.join(",")}`, "_blank");
          }} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4" /> Download PDF
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
                const tplName = emp.payroll_templates?.name || "Monthly Payroll (Default)";
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
                      {ex && (() => {
                        const paid = Number(ex.paid_amount || 0);
                        const payable = Number(ex.net_salary || 0);
                        const due = Math.max(0, payable - paid);
                        const pStatus = ex.payment_status || ex.status;
                        const isPaid = pStatus === "paid";
                        const isPartial = pStatus === "partial" || (paid > 0 && due > 0);
                        return (
                          <>
                            <div className="text-right min-w-[140px] text-xs">
                              <div className="text-green-600">পরিশোধিত: ৳{paid.toLocaleString()}</div>
                              <div className="text-destructive">বকেয়া: ৳{due.toLocaleString()}</div>
                            </div>
                            <Badge
                              variant={isPaid ? "default" : "outline"}
                              className={
                                isPaid
                                  ? "bg-green-600 hover:bg-green-700"
                                  : isPartial
                                    ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                                    : ""
                              }>
                              {isPaid ? "Fully Paid" : isPartial ? "Partially Paid" : "Unpaid"}
                            </Badge>
                            <Button size="icon" variant="ghost" onClick={() => setPreviewId(ex.id)}>
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                            {!isPaid && (
                              <Button size="sm" variant="default" onClick={() => setPayDialog(ex)}>Pay</Button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">কর্মী পাওয়া যায়নি</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipPaymentDialog payroll={payDialog} onClose={() => setPayDialog(null)} />

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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editLines.map((l, i) => (
                  <TableRow key={l.payhead_id}>
                    <TableCell className="font-medium">
                      {l.name}{l.is_basic && <span className="text-xs text-muted-foreground ml-1">(মূল)</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.type === "deduction" ? "destructive" : "default"}>
                        {l.type === "deduction" ? "কর্তন" : "ভাতা"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">৳{Number(l.base_amount || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" value={l.amount} className="w-28 ml-auto"
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setEditLines((prev) => prev.map((x, idx) => idx === i ? { ...x, amount: v } : x));
                        }} />
                    </TableCell>
                    <TableCell className="text-right">
                      {!l.is_basic && (
                        <Button size="sm" variant="ghost" onClick={() => removeLine(l.payhead_id)}>×</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-2 pt-3 border-t">
              <span className="text-sm text-muted-foreground">অতিরিক্ত যোগ করুন:</span>
              <Select value="" onValueChange={addExtraLine}>
                <SelectTrigger className="w-64"><SelectValue placeholder="পে-হেড নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  {(allPayheads || [])
                    .filter((p: any) => !editLines.find((l) => l.payhead_id === p.id))
                    .map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.type === "deduction" ? "কর্তন" : "ভাতা"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmp(null)}>বাতিল</Button>
            <Button onClick={saveEdit}>সংরক্ষণ ও জেনারেট</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog — single payslip */}
      <Dialog open={!!previewId} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Receipt className="h-5 w-5" /> পে-স্লিপ — {preview?.period_label}</span>
              <Button size="sm" onClick={() => preview && window.open(`/dashboard/hr/payslip/print?ids=${preview.id}`, "_blank")} className="gap-2 mr-6">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {preview && previewEmp && (
            <PayslipPrintView payroll={preview} employee={previewEmp} />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk preview dialog */}
      <Dialog open={!!bulkPreview} onOpenChange={(o) => !o && setBulkPreview(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>একাধিক পে-স্লিপ ({bulkPreview?.length})</span>
              <Button size="sm" onClick={() => bulkPreview && window.open(`/dashboard/hr/payslip/print?ids=${bulkPreview.join(",")}`, "_blank")} className="gap-2 mr-6">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {bulkPreview?.map((pid) => {
              const p = (existing || []).find((x: any) => x.id === pid);
              const e = p ? (employees || []).find((x: any) => x.id === p.employee_id) : null;
              if (!p || !e) return null;
              return (
                <div key={pid} className="border rounded">
                  <PayslipPrintView payroll={p} employee={e} />
                </div>
              );
            })}
          </div>
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
