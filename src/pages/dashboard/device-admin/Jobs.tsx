import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, RefreshCw, Trash2, Eye, CheckCircle, XCircle, Ban, Search } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  partial: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function Jobs() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailJob, setDetailJob] = useState<any>(null);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["device_admin_jobs", statusFilter, typeFilter],
    queryFn: async () => {
      let q = supabase.from("device_admin_deploy_jobs").select("*").order("created_at", { ascending: false }).limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (typeFilter !== "all") q = q.eq("job_type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const filtered = jobs.filter((j: any) =>
    !search || j.username?.toLowerCase().includes(search.toLowerCase()) || j.id.includes(search)
  );

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((j: any) => j.id)));
  };

  const retryJob = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("device_admin_deploy_jobs").update({ status: "pending", results: null, completed_at: null }).eq("id", id);
      const { error } = await supabase.functions.invoke("process-deploy-job", { body: { job_id: id } });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["device_admin_jobs"] }); toast.success("রিট্রাই শুরু হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("device_admin_deploy_jobs").update({
        status, completed_at: ["completed", "failed", "cancelled"].includes(status) ? new Date().toISOString() : null
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["device_admin_jobs"] }); toast.success("স্ট্যাটাস আপডেট হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const delJobs = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("device_admin_deploy_jobs").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => { qc.invalidateQueries({ queryKey: ["device_admin_jobs"] }); toast.success(`${ids.length} টি জব ডিলিট হয়েছে`); setSelected(new Set()); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = (action: "delete" | "cancel" | "retry") => {
    if (selected.size === 0) return toast.error("কমপক্ষে একটি জব সিলেক্ট করুন");
    const ids = Array.from(selected);
    if (action === "delete") {
      if (!confirm(`${ids.length} টি জব ডিলিট করবেন?`)) return;
      delJobs.mutate(ids);
    } else if (action === "cancel") {
      ids.forEach((id) => {
        const j = jobs.find((x: any) => x.id === id);
        if (j && j.status === "pending") setStatus.mutate({ id, status: "cancelled" });
      });
    } else if (action === "retry") {
      ids.forEach((id) => {
        const j = jobs.find((x: any) => x.id === id);
        if (j && (j.status === "failed" || j.status === "partial")) retryJob.mutate(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> জব ম্যানেজমেন্ট</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => bulkAction("retry")} disabled={selected.size === 0}><RefreshCw className="h-4 w-4 mr-1" /> Failed রিট্রাই</Button>
          <Button variant="outline" size="sm" onClick={() => bulkAction("cancel")} disabled={selected.size === 0}><Ban className="h-4 w-4 mr-1" /> Pending ক্যান্সেল</Button>
          <Button variant="destructive" size="sm" onClick={() => bulkAction("delete")} disabled={selected.size === 0}><Trash2 className="h-4 w-4 mr-1" /> ডিলিট ({selected.size})</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব টাইপ</SelectItem>
                <SelectItem value="deploy_user">Deploy User</SelectItem>
                <SelectItem value="delete_user">Delete User</SelectItem>
                <SelectItem value="backup">Backup</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="username বা job id..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-[240px]" />
            </div>
            <div className="ml-auto text-sm text-muted-foreground">মোট: {filtered.length} | সিলেক্টেড: {selected.size}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>সময়</TableHead>
                <TableHead>টাইপ</TableHead>
                <TableHead>ইউজার</TableHead>
                <TableHead>ডিভাইস</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead className="w-44">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">কোনো জব নেই</TableCell></TableRow>
              ) : filtered.map((j: any) => {
                const targets = Array.isArray(j.target_devices) ? j.target_devices : [];
                return (
                  <TableRow key={j.id}>
                    <TableCell><Checkbox checked={selected.has(j.id)} onCheckedChange={() => toggle(j.id)} /></TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(j.created_at).toLocaleString("bn-BD")}</TableCell>
                    <TableCell><Badge variant="outline">{j.job_type}</Badge></TableCell>
                    <TableCell className="font-medium">{j.username || "—"}</TableCell>
                    <TableCell className="text-sm">{targets.length} ডিভাইস</TableCell>
                    <TableCell>
                      <Select value={j.status} onValueChange={(v) => setStatus.mutate({ id: j.id, status: v })}>
                        <SelectTrigger className={`h-7 w-[120px] text-xs ${STATUS_COLORS[j.status] || ""}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="বিস্তারিত" onClick={() => setDetailJob(j)}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="রিট্রাই" onClick={() => retryJob.mutate(j.id)} disabled={j.status === "running"}><RefreshCw className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="ডিলিট" onClick={() => { if (confirm("ডিলিট?")) delJobs.mutate([j.id]); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detailJob} onOpenChange={(v) => !v && setDetailJob(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>জব বিস্তারিত</DialogTitle></DialogHeader>
          {detailJob && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{detailJob.id}</code></div>
                <div><span className="text-muted-foreground">টাইপ:</span> {detailJob.job_type}</div>
                <div><span className="text-muted-foreground">ইউজার:</span> {detailJob.username || "—"}</div>
                <div><span className="text-muted-foreground">পারমিশন:</span> {detailJob.permission || "—"}</div>
              </div>
              <div>
                <div className="font-medium mb-1">প্রতি-ডিভাইস ফলাফল:</div>
                <div className="border rounded max-h-64 overflow-auto">
                  {Array.isArray(detailJob.results) && detailJob.results.length > 0 ? detailJob.results.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 border-b last:border-0">
                      {r.ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <span className="font-medium">{r.device_name}</span>
                      <Badge variant="outline" className="text-xs">{r.device_type}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{r.message || (r.ok ? "OK" : "Failed")}</span>
                    </div>
                  )) : <div className="p-3 text-center text-muted-foreground text-xs">কোনো ফলাফল নেই</div>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
