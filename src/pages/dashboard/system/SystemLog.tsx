import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollText, Download, RefreshCw, Send, Plus, Trash2, ChevronRight, Activity, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

type LogRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string | null;
  entity_type: string | null;
  entity_label: string | null;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  device_name: string | null;
  log_message: string | null;
  metadata: any;
  forwarded: boolean;
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

function csvEscape(v: any) {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export default function SystemLog() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LogRow | null>(null);
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["system-logs", { search, actionFilter, severityFilter, entityFilter, page }],
    queryFn: async () => {
      let q = supabase
        .from("system_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      if (severityFilter !== "all") q = q.eq("severity", severityFilter);
      if (entityFilter !== "all") q = q.eq("entity_type", entityFilter);
      if (search.trim()) {
        q = q.or(`entity_label.ilike.%${search}%,log_message.ilike.%${search}%,ip_address.ilike.%${search}%`);
      }
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as LogRow[], total: count ?? 0 };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["system-logs-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [todayCount, errCount, fwdCount, loginCount] = await Promise.all([
        supabase.from("system_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("system_logs").select("id", { count: "exact", head: true }).in("severity", ["error", "critical"]),
        supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("forwarded", true),
        supabase.from("system_logs").select("id", { count: "exact", head: true }).eq("action", "login").gte("created_at", today.toISOString()),
      ]);
      return { today: todayCount.count ?? 0, errors: errCount.count ?? 0, forwarded: fwdCount.count ?? 0, logins: loginCount.count ?? 0 };
    },
    refetchInterval: 30000,
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("system_logs_rt").on("postgres_changes", { event: "INSERT", schema: "public", table: "system_logs" }, () => {
      qc.invalidateQueries({ queryKey: ["system-logs"] });
      qc.invalidateQueries({ queryKey: ["system-logs-stats"] });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  // Distinct filter values
  const { data: distincts } = useQuery({
    queryKey: ["system-logs-distincts"],
    queryFn: async () => {
      const { data } = await supabase.from("system_logs").select("action, entity_type").limit(1000);
      const actions = Array.from(new Set((data ?? []).map((r: any) => r.action).filter(Boolean)));
      const entities = Array.from(new Set((data ?? []).map((r: any) => r.entity_type).filter(Boolean)));
      return { actions, entities };
    },
  });

  function exportCsv() {
    const rows = data?.rows ?? [];
    if (rows.length === 0) { toast.error("রপ্তানির জন্য কোনো ডেটা নেই"); return; }
    const headers = ["Time", "Action", "Severity", "Entity", "Label", "IP", "User Agent", "User ID", "Message"];
    const lines = [headers.join(",")];
    rows.forEach(r => lines.push([
      r.created_at, r.action, r.severity, r.entity_type, r.entity_label, r.ip_address, r.user_agent, r.user_id, r.log_message,
    ].map(csvEscape).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `system-logs-${Date.now()}.csv`; a.click();
  }

  function exportJson() {
    const rows = data?.rows ?? [];
    if (rows.length === 0) { toast.error("রপ্তানির জন্য কোনো ডেটা নেই"); return; }
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `system-logs-${Date.now()}.json`; a.click();
  }

  const triggerForward = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("forward-system-logs");
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => { toast.success("ফরওয়ার্ড সম্পন্ন"); console.log(d); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6" /> সিস্টেম অডিট লগ</h1>
          <p className="text-sm text-muted-foreground">সমস্ত user activity, login এবং data পরিবর্তনের রেকর্ড</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-1" /> রিফ্রেশ</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={exportJson}><Download className="h-4 w-4 mr-1" /> JSON</Button>
          <Button variant="outline" size="sm" onClick={() => triggerForward.mutate()} disabled={triggerForward.isPending}>
            <Send className="h-4 w-4 mr-1" /> এখনই ফরওয়ার্ড
          </Button>
          <ForwardersSheet />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="আজকের ইভেন্ট" value={stats?.today ?? 0} icon={Activity} />
        <KpiCard title="আজকের লগইন" value={stats?.logins ?? 0} icon={Shield} />
        <KpiCard title="ত্রুটি / সমালোচনামূলক" value={stats?.errors ?? 0} icon={AlertTriangle} tone="destructive" />
        <KpiCard title="ফরওয়ার্ড করা" value={stats?.forwarded ?? 0} icon={Send} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-5">
          <Input placeholder="এনটিটি, IP বা মেসেজ সার্চ…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="অ্যাকশন" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব অ্যাকশন</SelectItem>
              {(distincts?.actions ?? []).map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="এনটিটি টাইপ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব এনটিটি</SelectItem>
              {(distincts?.entities ?? []).map((a: string) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="তীব্রতা" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground justify-end">
            মোট: <strong className="ml-1 text-foreground">{data?.total ?? 0}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>সময়</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                  <TableHead>এনটিটি</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>ডিভাইস</TableHead>
                  <TableHead>তীব্রতা</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো লগ পাওয়া যায়নি</TableCell></TableRow>
                )}
                {(data?.rows ?? []).map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(r)}>
                    <TableCell className="text-xs">
                      <div>{format(new Date(r.created_at), "dd MMM HH:mm:ss")}</div>
                      <div className="text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.action ?? "—"}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">{r.entity_type ?? "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.entity_label ?? r.log_message}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.ip_address ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">{r.device_name ?? r.user_agent ?? "—"}</TableCell>
                    <TableCell><Badge className={SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.info}>{r.severity}</Badge></TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">পেজ {page + 1} / {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>আগের</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>পরের</Button>
        </div>
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>লগ বিবরণ</SheetTitle></SheetHeader>
          {selected && (
            <div className="space-y-3 mt-4 text-sm">
              <Field label="সময়" value={format(new Date(selected.created_at), "dd MMM yyyy, HH:mm:ss")} />
              <Field label="অ্যাকশন" value={selected.action} />
              <Field label="তীব্রতা" value={selected.severity} />
              <Field label="এনটিটি" value={`${selected.entity_type ?? "—"} · ${selected.entity_label ?? "—"}`} />
              <Field label="মেসেজ" value={selected.log_message} />
              <Field label="IP" value={selected.ip_address} />
              <Field label="ইউজার এজেন্ট" value={selected.user_agent} />
              <Field label="ডিভাইস" value={selected.device_name} />
              <Field label="ফরওয়ার্ড" value={selected.forwarded ? "হ্যাঁ" : "না"} />
              <div>
                <div className="text-xs text-muted-foreground mb-1">মেটাডেটা</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-96">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, tone }: { title: string; value: number; icon: any; tone?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${tone === "destructive" ? "text-destructive" : "text-primary"}`} />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value.toLocaleString("bn-BD")}</div></CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="col-span-2 break-all">{value ?? "—"}</div>
    </div>
  );
}

function ForwardersSheet() {
  const qc = useQueryClient();
  const { data: forwarders, refetch } = useQuery({
    queryKey: ["log-forwarders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_log_forwarders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", auth_header: "", min_severity: "info", enabled: true });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_log_forwarders").insert(form as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("ফরওয়ার্ডার যুক্ত হয়েছে"); setOpen(false); setForm({ name: "", url: "", auth_header: "", min_severity: "info", enabled: true }); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("system_log_forwarders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("মুছে ফেলা হয়েছে"); refetch(); },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("system_log_forwarders").update({ enabled } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetch(),
  });

  return (
    <Sheet>
      <SheetTrigger asChild><Button size="sm"><Send className="h-4 w-4 mr-1" /> ফরওয়ার্ডার</Button></SheetTrigger>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>রিমোট লগ ফরওয়ার্ডার</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> নতুন এন্ডপয়েন্ট</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>নতুন ফরওয়ার্ডার</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>নাম</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://logs.example.com/ingest" /></div>
                <div><Label>Auth Header (optional)</Label><Input value={form.auth_header} onChange={(e) => setForm({ ...form, auth_header: e.target.value })} placeholder="Bearer xxx" /></div>
                <div>
                  <Label>সর্বনিম্ন তীব্রতা</Label>
                  <Select value={form.min_severity} onValueChange={(v) => setForm({ ...form, min_severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} /><Label>সক্রিয়</Label></div>
              </div>
              <DialogFooter><Button onClick={() => save.mutate()} disabled={!form.name || !form.url || save.isPending}>সংরক্ষণ</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="space-y-2">
            {(forwarders ?? []).map(f => (
              <Card key={f.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{f.url}</div>
                    <div className="text-xs mt-1 flex gap-2">
                      <Badge variant="outline">≥ {f.min_severity}</Badge>
                      {f.last_sent_at && <span className="text-muted-foreground">last: {formatDistanceToNow(new Date(f.last_sent_at), { addSuffix: true })}</span>}
                      {f.last_error && <span className="text-destructive">err: {f.last_error}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={f.enabled} onCheckedChange={(v) => toggle.mutate({ id: f.id, enabled: v })} />
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(forwarders ?? []).length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">কোনো ফরওয়ার্ডার সেট করা নেই</div>}
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <strong>স্বয়ংক্রিয় ফরওয়ার্ডিং:</strong> ৫ মিনিট অন্তর cron schedule করতে নিচের SQL Supabase SQL Editor-এ চালান:
            <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">{`SELECT cron.schedule('forward-system-logs','*/5 * * * *', $$SELECT net.http_post(url:='https://hdrhscfambaswndxqzau.supabase.co/functions/v1/forward-system-logs', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb)$$);`}</pre>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
