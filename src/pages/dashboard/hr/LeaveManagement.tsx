import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarDays, Plus, Pencil, Trash2, Search, RefreshCw,
  CheckCircle, XCircle, Eye, Calendar as CalendarIcon, FolderOpen, Settings, CheckSquare, FileText,
} from "lucide-react";
import PolicyEditor from "@/components/leave/PolicyEditor";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "অপেক্ষমাণ", variant: "outline", color: "text-yellow-600" },
  approved: { label: "অনুমোদিত", variant: "default", color: "text-green-600" },
  rejected: { label: "প্রত্যাখ্যাত", variant: "destructive", color: "text-red-600" },
};

export default function LeaveManagement() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "apply";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setSearchParams({ tab }, { replace: true });
  }, [tab, setSearchParams]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">ছুটি ম্যানেজমেন্ট</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="apply"><FileText className="h-3.5 w-3.5 mr-1" /> আবেদন</TabsTrigger>
          {isAdmin && <TabsTrigger value="approval"><CheckSquare className="h-3.5 w-3.5 mr-1" /> অনুমোদন</TabsTrigger>}
          {isAdmin && <TabsTrigger value="categories"><FolderOpen className="h-3.5 w-3.5 mr-1" /> ক্যাটাগরি</TabsTrigger>}
          {isAdmin && <TabsTrigger value="setup"><Settings className="h-3.5 w-3.5 mr-1" /> Policy ও সেটআপ</TabsTrigger>}
        </TabsList>

        <TabsContent value="apply" className="mt-4"><ApplyTab /></TabsContent>
        {isAdmin && <TabsContent value="approval" className="mt-4"><ApprovalTab user={user} /></TabsContent>}
        {isAdmin && <TabsContent value="categories" className="mt-4"><CategoriesTab /></TabsContent>}
        {isAdmin && <TabsContent value="setup" className="mt-4"><SetupTab /></TabsContent>}
      </Tabs>
    </div>
  );
}

/* ===================== APPLY TAB ===================== */
function ApplyTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category_id: "", start_date: "", end_date: "", reason: "" });

  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("employees").select("id, name, employee_id").eq("email", user.email).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["leave-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_categories").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const currentYear = new Date().getFullYear();

  const { data: balances = [] } = useQuery({
    queryKey: ["my-leave-balances", employee?.id, currentYear],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*, leave_categories(name)")
        .eq("employee_id", employee.id)
        .eq("year", currentYear);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!employee,
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["my-leave-applications", employee?.id],
    queryFn: async () => {
      if (!employee) return [];
      const { data, error } = await supabase
        .from("leave_applications")
        .select("*, leave_categories(name)")
        .eq("employee_id", employee.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!employee,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error("আপনার কর্মী প্রোফাইল পাওয়া যায়নি");
      if (!form.category_id || !form.start_date || !form.end_date) throw new Error("সকল তথ্য দিন");
      const start = new Date(form.start_date);
      const end = new Date(form.end_date);
      if (end < start) throw new Error("শেষ তারিখ শুরুর তারিখের পরে হতে হবে");
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const balance = balances.find((b: any) => b.category_id === form.category_id);
      if (balance && balance.remaining_days < days) {
        throw new Error(`পর্যাপ্ত ব্যালেন্স নেই। অবশিষ্ট: ${balance.remaining_days} দিন, আবেদন: ${days} দিন`);
      }
      const { error } = await supabase.from("leave_applications").insert({
        employee_id: employee.id,
        category_id: form.category_id,
        start_date: form.start_date,
        end_date: form.end_date,
        days,
        reason: form.reason || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-applications"] });
      toast.success("লিভ আবেদন জমা হয়েছে");
      setDialogOpen(false);
      setForm({ category_id: "", start_date: "", end_date: "", reason: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
        <CalendarDays className="h-10 w-10" />
        <p>আপনার ইমেইলের সাথে কোনো কর্মী প্রোফাইল পাওয়া যায়নি।</p>
        <p className="text-xs">অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">আমার ছুটি</h2>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> নতুন আবেদন</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {balances.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground truncate">{b.leave_categories?.name}</p>
              <p className="text-2xl font-bold text-foreground">{b.remaining_days}</p>
              <p className="text-xs text-muted-foreground">/ {b.total_days} দিন</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>ক্যাটাগরি</TableHead>
              <TableHead>শুরু</TableHead>
              <TableHead>শেষ</TableHead>
              <TableHead>দিন</TableHead>
              <TableHead>কারণ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>তারিখ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
            ) : applications.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো আবেদন নেই</TableCell></TableRow>
            ) : applications.map((a: any, i: number) => {
              const s = statusMap[a.status] || statusMap.pending;
              return (
                <TableRow key={a.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{a.leave_categories?.name}</TableCell>
                  <TableCell>{a.start_date}</TableCell>
                  <TableCell>{a.end_date}</TableCell>
                  <TableCell>{a.days}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{a.reason || "—"}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleDateString("bn-BD")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন লিভ আবেদন</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>লিভ ক্যাটাগরি *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="ক্যাটাগরি বাছুন" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => {
                    const bal = balances.find((b: any) => b.category_id === c.id);
                    return <SelectItem key={c.id} value={c.id}>{c.name} {bal ? `(অবশিষ্ট: ${bal.remaining_days})` : ""}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>শুরুর তারিখ *</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>শেষ তারিখ *</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            {form.start_date && form.end_date && new Date(form.end_date) >= new Date(form.start_date) && (
              <p className="text-sm text-muted-foreground">
                <CalendarIcon className="inline h-3.5 w-3.5 mr-1" />
                মোট {Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} দিন
              </p>
            )}
            <div><Label>কারণ</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="লিভের কারণ লিখুন..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>{applyMutation.isPending ? "জমা হচ্ছে..." : "আবেদন জমা দিন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== APPROVAL TAB ===================== */
function ApprovalTab({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [detailApp, setDetailApp] = useState<any>(null);
  const [remarks, setRemarks] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["all-leave-applications", statusFilter],
    queryFn: async () => {
      let q = supabase.from("leave_applications").select("*, employees(name, employee_id), leave_categories(name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "rejected" }) => {
      const app = applications.find((a: any) => a.id === id);
      if (!app) throw new Error("আবেদন পাওয়া যায়নি");
      const { error } = await supabase.from("leave_applications").update({
        status: action,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        remarks: remarks || null,
      }).eq("id", id);
      if (error) throw error;
      if (action === "approved" && app.days) {
        const yr = new Date(app.start_date).getFullYear();
        const { data: balance } = await supabase.from("leave_balances").select("*").eq("employee_id", app.employee_id).eq("category_id", app.category_id).eq("year", yr).maybeSingle();
        if (balance) {
          const newUsed = (balance.used_days || 0) + app.days;
          await supabase.from("leave_balances").update({ used_days: newUsed, remaining_days: Math.max(0, (balance.total_days || 0) - newUsed) }).eq("id", balance.id);
        }
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["all-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success(action === "approved" ? "অনুমোদিত" : "প্রত্যাখ্যাত");
      setDetailApp(null); setRemarks("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = applications.filter((a: any) => (a.employees?.name?.toLowerCase() || "").includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">অপেক্ষমাণ</p>
            <p className="text-2xl font-bold text-yellow-600">{applications.filter((a: any) => a.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("approved")}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">অনুমোদিত</p>
            <p className="text-2xl font-bold text-green-600">{applications.filter((a: any) => a.status === "approved").length}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("rejected")}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">প্রত্যাখ্যাত</p>
            <p className="text-2xl font-bold text-red-600">{applications.filter((a: any) => a.status === "rejected").length}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">মোট</p>
            <p className="text-2xl font-bold text-foreground">{applications.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল</SelectItem>
            <SelectItem value="pending">অপেক্ষমাণ</SelectItem>
            <SelectItem value="approved">অনুমোদিত</SelectItem>
            <SelectItem value="rejected">প্রত্যাখ্যাত</SelectItem>
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
              <TableHead>#</TableHead>
              <TableHead>কর্মী</TableHead>
              <TableHead>ক্যাটাগরি</TableHead>
              <TableHead>শুরু</TableHead>
              <TableHead>শেষ</TableHead>
              <TableHead>দিন</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">কোনো আবেদন নেই</TableCell></TableRow>
            ) : filtered.map((a: any, i: number) => {
              const s = statusMap[a.status] || statusMap.pending;
              return (
                <TableRow key={a.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{a.employees?.name} <span className="text-xs text-muted-foreground">({a.employees?.employee_id})</span></TableCell>
                  <TableCell>{a.leave_categories?.name}</TableCell>
                  <TableCell>{a.start_date}</TableCell>
                  <TableCell>{a.end_date}</TableCell>
                  <TableCell>{a.days}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => { setDetailApp(a); setRemarks(""); }}><Eye className="h-4 w-4" /></Button>
                    {a.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => actionMutation.mutate({ id: a.id, action: "approved" })}><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => actionMutation.mutate({ id: a.id, action: "rejected" })}><XCircle className="h-4 w-4 text-red-600" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>লিভ আবেদনের বিবরণ</DialogTitle></DialogHeader>
          {detailApp && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">কর্মী:</span> <strong>{detailApp.employees?.name}</strong></div>
                <div><span className="text-muted-foreground">আইডি:</span> {detailApp.employees?.employee_id}</div>
                <div><span className="text-muted-foreground">ক্যাটাগরি:</span> {detailApp.leave_categories?.name}</div>
                <div><span className="text-muted-foreground">দিন:</span> {detailApp.days}</div>
                <div><span className="text-muted-foreground">শুরু:</span> {detailApp.start_date}</div>
                <div><span className="text-muted-foreground">শেষ:</span> {detailApp.end_date}</div>
              </div>
              {detailApp.reason && <div><span className="text-muted-foreground">কারণ:</span><p className="mt-1">{detailApp.reason}</p></div>}
              {detailApp.status === "pending" && (
                <div>
                  <span className="text-muted-foreground">মন্তব্য (ঐচ্ছিক):</span>
                  <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1" />
                </div>
              )}
              {detailApp.remarks && detailApp.status !== "pending" && (
                <div><span className="text-muted-foreground">মন্তব্য:</span><p className="mt-1">{detailApp.remarks}</p></div>
              )}
            </div>
          )}
          <DialogFooter>
            {detailApp?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => actionMutation.mutate({ id: detailApp.id, action: "rejected" })} disabled={actionMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> প্রত্যাখ্যান
                </Button>
                <Button onClick={() => actionMutation.mutate({ id: detailApp.id, action: "approved" })} disabled={actionMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" /> অনুমোদন
                </Button>
              </>
            )}
            {detailApp?.status !== "pending" && <Button variant="outline" onClick={() => setDetailApp(null)}>বন্ধ করুন</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== CATEGORIES TAB ===================== */
function CategoriesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", days_allowed: "0", description: "", status: "active" });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["leave-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_categories").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, days_allowed: parseInt(form.days_allowed) || 0, description: form.description || null, status: form.status };
      if (editing) {
        const { error } = await supabase.from("leave_categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("leave_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-categories"] });
      toast.success(editing ? "আপডেট হয়েছে" : "যোগ হয়েছে");
      setDialogOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leave-categories"] }); toast.success("মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => { setEditing(null); setForm({ name: "", days_allowed: "0", description: "", status: "active" }); setDialogOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, days_allowed: String(c.days_allowed ?? 0), description: c.description || "", status: c.status }); setDialogOpen(true); };

  const filtered = categories.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> নতুন ক্যাটাগরি</Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>ক্যাটাগরি নাম</TableHead>
              <TableHead>অনুমোদিত দিন</TableHead>
              <TableHead>বিবরণ</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো ক্যাটাগরি নেই</TableCell></TableRow>
            ) : filtered.map((c: any, i: number) => (
              <TableRow key={c.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.days_allowed ?? 0} দিন</TableCell>
                <TableCell className="max-w-[200px] truncate">{c.description || "—"}</TableCell>
                <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "ক্যাটাগরি সম্পাদনা" : "নতুন ক্যাটাগরি"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>ক্যাটাগরি নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>বার্ষিক অনুমোদিত দিন</Label><Input type="number" value={form.days_allowed} onChange={(e) => setForm({ ...form, days_allowed: e.target.value })} /></div>
            <div><Label>বিবরণ</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>স্ট্যাটাস</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>সেভ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== SETUP / POLICY TAB ===================== */
function SetupTab() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [search, setSearch] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active-with-pos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, employee_id, department_id, designation_id, position_id")
        .eq("status", "active").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["leave-categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_categories").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["leave-policies-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("leave_policies").select("*");
      if (error) throw error;
      return data as any[];
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
      return data as any[];
    },
  });

  // Resolve days from policy with priority: designation -> department -> category default
  const resolveDays = (emp: any, cat: any): number => {
    const desigKey = emp.designation_id || emp.position_id;
    if (desigKey) {
      const p = policies.find((x: any) => x.scope_type === "designation" && x.scope_id === desigKey && x.category_id === cat.id);
      if (p) return p.days_allowed;
    }
    if (emp.department_id) {
      const p = policies.find((x: any) => x.scope_type === "department" && x.scope_id === emp.department_id && x.category_id === cat.id);
      if (p) return p.days_allowed;
    }
    return cat.days_allowed ?? 0;
  };

  const bulkAllMutation = useMutation({
    mutationFn: async () => {
      const rows = employees.flatMap((emp: any) =>
        categories.map((cat: any) => {
          const total = resolveDays(emp, cat);
          return {
            employee_id: emp.id,
            category_id: cat.id,
            year: parseInt(year),
            total_days: total,
            used_days: 0,
            remaining_days: total,
          };
        }),
      );
      const { error } = await supabase.from("leave_balances").upsert(rows, { onConflict: "employee_id,category_id,year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success("Policy অনুসারে সকল কর্মীর ব্যালেন্স বরাদ্দ হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = balances.reduce((acc: Record<string, any[]>, b: any) => {
    const empName = b.employees?.name || "Unknown";
    if (!acc[empName]) acc[empName] = [];
    acc[empName].push(b);
    return acc;
  }, {});

  const filteredEntries = Object.entries(grouped).filter(([name]) => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Section A: Department/Designation Policy */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">ডিপার্টমেন্ট / পদবী অনুসারে Leave Policy</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          এখানে assigned policy অনুযায়ী নিচের "সকল কর্মী বরাদ্দ" বাটন দিয়ে স্বয়ংক্রিয়ভাবে যাবতীয় কর্মীর leave balance বরাদ্দ করা যাবে।
          Priority: পদবী &gt; ডিপার্টমেন্ট &gt; ক্যাটাগরির default।
        </p>
        <PolicyEditor />
      </section>

      <hr className="border-border" />

      {/* Section B: Per-employee yearly balance */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-base font-semibold">বার্ষিক Leave Balance ({year})</h2>
          <Button variant="outline" size="sm" onClick={() => bulkAllMutation.mutate()} disabled={bulkAllMutation.isPending}>
            <RefreshCw className="h-4 w-4 mr-1" /> Policy অনুযায়ী সকল কর্মী বরাদ্দ
          </Button>
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
                {categories.map((c: any) => <TableHead key={c.id} className="text-center">{c.name}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={categories.length + 1} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</TableCell></TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow><TableCell colSpan={categories.length + 1} className="text-center py-8 text-muted-foreground">কোনো ডাটা নেই। উপরে "Policy অনুযায়ী সকল কর্মী বরাদ্দ" চাপুন।</TableCell></TableRow>
              ) : filteredEntries.map(([name, bals]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium whitespace-nowrap">{name}</TableCell>
                  {categories.map((cat: any) => {
                    const b = (bals as any[]).find((x: any) => x.category_id === cat.id);
                    return (
                      <TableCell key={cat.id} className="text-center">
                        {b ? (
                          <span className="text-xs">
                            <Badge variant="outline" className="mr-1">{b.remaining_days}/{b.total_days}</Badge>
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
      </section>
    </div>
  );
}
