import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, XCircle } from "lucide-react";
import { toast } from "sonner";
import { usePopScope } from "@/hooks/usePopScope";

export default function Scheduler() {
  const queryClient = useQueryClient();
  const { isPopMode, branchId } = usePopScope();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [form, setForm] = useState({ client_id: "", scheduler_type: "package_scheduler", previous_info: "", schedule_info: "", remarks: "", schedule_date: "" });

  const { data: schedulers, isLoading } = useQuery({
    queryKey: ["client-schedulers", branchId || "all"],
    queryFn: async () => {
      let q: any = supabase
        .from("client_schedulers")
        .select("*, clients:client_id(client_id, name, contact, username, branch_id, zones:zone_id(name))")
        .order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      // Filter to clients in this branch (client_schedulers itself has no branch column)
      if (isPopMode && branchId) {
        return (data || []).filter((s: any) => s.clients?.branch_id === branchId);
      }
      return data;
    },
  });

  const { data: clientsList } = useQuery({
    queryKey: ["clients-for-select", branchId || "all"],
    queryFn: async () => {
      let q: any = supabase.from("clients").select("id, client_id, name, username, branch_id").eq("status", "active").limit(500);
      if (isPopMode && branchId) q = q.eq("branch_id", branchId);
      else q = q.eq("owner_scope", "admin");
      const { data } = await q;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!values.client_id || !values.scheduler_type) throw new Error("ক্লায়েন্ট ও শিডিউলার টাইপ আবশ্যক");
      const { error } = await supabase.from("client_schedulers").insert({
        client_id: values.client_id,
        scheduler_type: values.scheduler_type,
        previous_info: values.previous_info || null,
        schedule_info: values.schedule_info || null,
        remarks: values.remarks || null,
        schedule_date: values.schedule_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-schedulers"] });
      toast.success("শিডিউল তৈরি হয়েছে");
      setDialogOpen(false);
      setForm({ client_id: "", scheduler_type: "package_scheduler", previous_info: "", schedule_info: "", remarks: "", schedule_date: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_schedulers").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-schedulers"] });
      toast.success("শিডিউল বাতিল হয়েছে");
    },
  });

  const filtered = useMemo(() => {
    let list = schedulers || [];
    if (filterType !== "all") list = list.filter((s: any) => s.scheduler_type === filterType);
    if (filterStatus !== "all") list = list.filter((s: any) => s.status === filterStatus);
    if (filterFromDate) list = list.filter((s: any) => s.schedule_date && s.schedule_date >= filterFromDate);
    if (filterToDate) list = list.filter((s: any) => s.schedule_date && s.schedule_date <= filterToDate);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((r: any) => r.clients?.name?.toLowerCase().includes(s) || r.clients?.client_id?.toLowerCase().includes(s));
    }
    return list;
  }, [schedulers, search, filterType, filterStatus, filterFromDate, filterToDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client <span className="text-sm font-normal text-muted-foreground">Scheduler (Package & Status)</span></h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Generate PDF</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Schedule</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border rounded-lg bg-card">
        <div>
          <Label className="text-xs uppercase">Scheduler Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              <SelectItem value="package_scheduler">Package Scheduler</SelectItem>
              <SelectItem value="status_scheduler">Status Scheduler</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">Activity Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase">From Date</Label>
          <Input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">To Date</Label>
          <Input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs uppercase">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/10">
              <TableHead className="text-xs">Code</TableHead>
              <TableHead className="text-xs">ID/IP</TableHead>
              <TableHead className="text-xs">Customer Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Zone</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Previous Info</TableHead>
              <TableHead className="text-xs">Schedule Info</TableHead>
              <TableHead className="text-xs">Remarks</TableHead>
              <TableHead className="text-xs">Schedule Date</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="text-center py-8">কোনো শিডিউল পাওয়া যায়নি</TableCell></TableRow>
            ) : (
              filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{s.clients?.client_id || "-"}</TableCell>
                  <TableCell className="text-xs">{s.clients?.username || "-"}</TableCell>
                  <TableCell className="text-xs font-medium">{s.clients?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{s.clients?.contact || "-"}</TableCell>
                  <TableCell className="text-xs">{s.clients?.zones?.name || "-"}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px]">{s.scheduler_type === "package_scheduler" ? "Package" : "Status"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{s.previous_info || "-"}</TableCell>
                  <TableCell className="text-xs">{s.schedule_info || "-"}</TableCell>
                  <TableCell className="text-xs">{s.remarks || "-"}</TableCell>
                  <TableCell className="text-xs">{s.schedule_date || "-"}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px]">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.status === "pending" && (
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => cancelMutation.mutate(s.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Client Package/Status Scheduler</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>User Name (ID) *</Label>
              <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clientsList?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.client_id} ({c.name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduler Type *</Label>
              <Select value={form.scheduler_type} onValueChange={v => setForm(p => ({ ...p, scheduler_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="package_scheduler">Package Scheduler</SelectItem>
                  <SelectItem value="status_scheduler">Status Scheduler</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule Info</Label>
              <Input value={form.schedule_info} onChange={e => setForm(p => ({ ...p, schedule_info: e.target.value }))} />
            </div>
            <div>
              <Label>Schedule Date</Label>
              <Input type="date" value={form.schedule_date} onChange={e => setForm(p => ({ ...p, schedule_date: e.target.value }))} />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
              {createMutation.isPending ? "সেভ হচ্ছে..." : "Create Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
