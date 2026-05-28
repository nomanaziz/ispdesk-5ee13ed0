import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, UserX, Download, Pencil, History, FileText } from "lucide-react";

type Employee = { id: string; name: string; employee_id: string };
type Rule = { id: string; name: string; is_active: boolean };
type Resignation = {
  id: string;
  employee_id: string;
  type: "resign" | "terminate";
  resign_date: string | null;
  last_working_date: string | null;
  letter_received_date: string | null;
  reason: string | null;
  good_or_bad_activities: string | null;
  resignation_letter_url: string | null;
  is_applied: boolean;
  applied_rules: any;
  status: string;
  created_at: string;
  employees?: { name: string; employee_id: string } | null;
};

const emptyForm = {
  employee_id: "",
  type: "resign" as "resign" | "terminate",
  resign_date: "",
  letter_received_date: "",
  reason: "",
  good_or_bad_activities: "",
  is_applied: false,
  applied_rules: [] as string[],
  file: null as File | null,
};

export default function Resignations() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyEmp, setHistoryEmp] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: employees } = useQuery({
    queryKey: ["employees-all-for-resign"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id,name,employee_id,status").order("name");
      return (data || []) as any as (Employee & { status: string })[];
    },
  });

  const { data: rules } = useQuery({
    queryKey: ["resign_rules_active"],
    queryFn: async () => {
      const { data } = await (supabase.from("resign_rules") as any).select("id,name,is_active").eq("is_active", true).order("created_at");
      return (data || []) as Rule[];
    },
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ["resignations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resignations")
        .select("*, employees(name, employee_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any as Resignation[];
    },
  });

  const filtered = useMemo(() => {
    return (list || []).filter((r) => {
      if (filterType !== "all" && r.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit = r.employees?.name?.toLowerCase().includes(q) || r.employees?.employee_id?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [list, search, filterType]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.employee_id) throw new Error("কর্মী নির্বাচন করুন");
      if (!form.resign_date) throw new Error("Resign date দিন");
      if (!form.reason.trim()) throw new Error("কারণ লিখুন");

      let letterUrl: string | null = null;
      if (form.file) {
        const { data: u } = await supabase.auth.getUser();
        // Folder must be auth.uid() to satisfy storage RLS (owner-scoped upload)
        const path = `${u.user?.id}/${form.employee_id}/${Date.now()}-${form.file.name}`;
        const { error: upErr } = await supabase.storage.from("resignation-letters").upload(path, form.file);
        if (upErr) throw upErr;
        letterUrl = path;
      }

      const applied_rules = (rules || []).map((r) => ({ rule_id: r.id, name: r.name, checked: form.applied_rules.includes(r.id) }));

      const payload: any = {
        employee_id: form.employee_id,
        type: form.type,
        resign_date: form.resign_date,
        last_working_date: form.resign_date,
        letter_received_date: form.letter_received_date || null,
        reason: form.reason,
        good_or_bad_activities: form.good_or_bad_activities || null,
        is_applied: form.is_applied,
        applied_rules,
        status: form.is_applied ? "approved" : "pending",
      };
      if (letterUrl) payload.resignation_letter_url = letterUrl;

      if (editingId) {
        const { error } = await supabase.from("resignations").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resignations").insert(payload);
        if (error) throw error;
      }

      if (form.is_applied) {
        await supabase.from("employees").update({ status: form.type === "terminate" ? "terminated" : "resigned" } as any).eq("id", form.employee_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resignations"] });
      qc.invalidateQueries({ queryKey: ["employees-all-for-resign"] });
      toast.success("সংরক্ষণ হয়েছে");
      setOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };
  const openEdit = (r: Resignation) => {
    setEditingId(r.id);
    const checked = Array.isArray(r.applied_rules) ? r.applied_rules.filter((x: any) => x.checked).map((x: any) => x.rule_id) : [];
    setForm({
      employee_id: r.employee_id,
      type: r.type,
      resign_date: r.resign_date || "",
      letter_received_date: r.letter_received_date || "",
      reason: r.reason || "",
      good_or_bad_activities: r.good_or_bad_activities || "",
      is_applied: r.is_applied,
      applied_rules: checked,
      file: null,
    });
    setOpen(true);
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("resignation-letters").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const history = (list || []).filter((r) => r.employee_id === historyEmp);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পদত্যাগ</h1>
          <p className="text-sm text-muted-foreground">HR &amp; Payroll — পদত্যাগ ম্যানেজমেন্ট</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> নতুন পদত্যাগ</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
            <UserX className="h-5 w-5" /> পদত্যাগ তালিকা <Badge variant="secondary">{filtered.length}</Badge>
            <div className="ml-auto flex gap-2 items-center">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব Type</SelectItem>
                  <SelectItem value="resign">Resign</SelectItem>
                  <SelectItem value="terminate">Terminate</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 h-9" />
            </div>
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
                    <TableHead>কর্মী</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Resign Date</TableHead>
                    <TableHead>Letter Date</TableHead>
                    <TableHead>কারণ</TableHead>
                    <TableHead>Activities</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো পদত্যাগ নেই</TableCell></TableRow>
                  )}
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.employees?.name || "—"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.employees?.employee_id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.type === "terminate" ? "destructive" : "secondary"}>{r.type === "terminate" ? "Terminate" : "Resign"}</Badge>
                      </TableCell>
                      <TableCell>{r.resign_date || "—"}</TableCell>
                      <TableCell>{r.letter_received_date || "—"}</TableCell>
                      <TableCell className="max-w-48 truncate">{r.reason || "—"}</TableCell>
                      <TableCell className="max-w-40 truncate">{r.good_or_bad_activities || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.resignation_letter_url && (
                            <Button size="icon" variant="ghost" title="Download attachment" onClick={() => download(r.resignation_letter_url!)}><Download className="h-4 w-4" /></Button>
                          )}
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(r)}><Pencil className="h-4 w-4 text-green-600" /></Button>
                          <Button size="icon" variant="ghost" title="History" onClick={() => setHistoryEmp(r.employee_id)}><History className="h-4 w-4" /></Button>
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

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "পদত্যাগ এডিট" : "নতুন পদত্যাগ"}</DialogTitle>
            <DialogDescription>পদত্যাগ অথবা termination এর তথ্য দিন</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <RadioGroup value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="resign" id="rg-r" /><Label htmlFor="rg-r">Resign</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="terminate" id="rg-t" /><Label htmlFor="rg-t">Terminate</Label></div>
            </RadioGroup>

            <div>
              <Label>কর্মী <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="কর্মী নির্বাচন" /></SelectTrigger>
                <SelectContent>
                  {(employees || []).filter((e) => e.status === "active").map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.employee_id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Letter Received Date</Label>
                <Input type="date" value={form.letter_received_date} onChange={(e) => setForm({ ...form, letter_received_date: e.target.value })} />
              </div>
              <div>
                <Label>Resign Date (End Date) <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.resign_date} onChange={(e) => setForm({ ...form, resign_date: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Resignation Letter</Label>
              <Input type="file" accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.doc,.txt" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              <p className="text-xs text-muted-foreground mt-1">Supported: jpg, png, pdf, doc, docx, txt</p>
            </div>

            {(rules || []).length > 0 && (
              <div className="border rounded-md p-3 space-y-2">
                <div className="font-medium text-sm">Official Resign Rules:</div>
                {(rules || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`rule-${r.id}`}
                      checked={form.applied_rules.includes(r.id)}
                      onCheckedChange={(c) => {
                        setForm({
                          ...form,
                          applied_rules: c ? [...form.applied_rules, r.id] : form.applied_rules.filter((x) => x !== r.id),
                        });
                      }}
                    />
                    <Label htmlFor={`rule-${r.id}`} className="font-normal cursor-pointer">{r.name}</Label>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Reason for Resignation <span className="text-destructive">*</span></Label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} />
            </div>

            <div>
              <Label>Good or Bad Activities</Label>
              <Textarea value={form.good_or_bad_activities} onChange={(e) => setForm({ ...form, good_or_bad_activities: e.target.value })} rows={2} />
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-md">
              <Checkbox id="applied" checked={form.is_applied} onCheckedChange={(c) => setForm({ ...form, is_applied: Boolean(c) })} />
              <div>
                <Label htmlFor="applied" className="cursor-pointer">Is Resignation Applied</Label>
                <p className="text-xs text-muted-foreground">Apply করলে এই employee inactive list-এ চলে যাবে</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "সংরক্ষণ হচ্ছে..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyEmp} onOpenChange={(o) => !o && setHistoryEmp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Resignation History</DialogTitle>
            <DialogDescription>এই কর্মীর সকল resignation entries</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">কোনো history নেই</p>}
            {history.map((r) => (
              <div key={r.id} className="border rounded-md p-3 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={r.type === "terminate" ? "destructive" : "secondary"}>{r.type}</Badge>
                  <span className="text-muted-foreground">{r.resign_date}</span>
                  {r.is_applied && <Badge variant="default">Applied</Badge>}
                </div>
                {r.reason && <div><span className="font-medium">কারণ:</span> {r.reason}</div>}
                {r.good_or_bad_activities && <div><span className="font-medium">Activities:</span> {r.good_or_bad_activities}</div>}
                {r.resignation_letter_url && (
                  <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => download(r.resignation_letter_url!)}>
                    <FileText className="h-3 w-3" /> Letter
                  </Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
