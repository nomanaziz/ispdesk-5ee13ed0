import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployeeContext } from "@/hooks/useEmployeeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, MessageSquare, Trash2, Users, TicketCheck, Clock, CheckCircle2, AlertTriangle, Send, FolderOpen, Play, X, ThumbsUp, ThumbsDown, Wifi, WifiOff } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d:${h}h:${m}m:${sec}s`;
}

// Live ticking elapsed time since a start timestamp
function LiveElapsed({ start, className = "" }: { start: string; className?: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const ms = Date.now() - new Date(start).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return <span className={className}>{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}</span>;
}

export default function Tickets() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { isEmployee, isEmployeeOnly } = useEmployeeContext();
  const [tab, setTab] = useState("accepted");
  const [search, setSearch] = useState("");
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewTicketOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    if (searchParams.get("mine") === "1") {
      setMyOnly(true);
      searchParams.delete("mine");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [solveDialogOpen, setSolveDialogOpen] = useState(false);
  const [solveTicket, setSolveTicket] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  // Default ON for employees so they only see their assigned tickets
  const [myOnly, setMyOnly] = useState(isEmployeeOnly);
  useEffect(() => { if (isEmployeeOnly) setMyOnly(true); }, [isEmployeeOnly]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assignDept, setAssignDept] = useState<string>("");
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSms, setAssignSms] = useState(true);
  const [newComment, setNewComment] = useState("");

  // New ticket form
  const [ticketForm, setTicketForm] = useState({
    client_id: "", subject: "", description: "", category_id: "", priority: "medium", complain_no: "", source: "admin",
  });
  const [clientSearch, setClientSearch] = useState("");

  // Realtime: invalidate on any change to tickets / assignees
  useEffect(() => {
    const channel = supabase
      .channel("support-tickets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        qc.invalidateQueries({ queryKey: ["support_tickets"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_ticket_assignees" }, () => {
        qc.invalidateQueries({ queryKey: ["ticket_assignees"] });
        qc.invalidateQueries({ queryKey: ["support_tickets"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, support_categories(name), clients(name, client_id, contact, username, billing_status, mac_address, remote_address, is_online), zones(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch assignees for all tickets
  const { data: allAssignees = [] } = useQuery({
    queryKey: ["ticket_assignees"],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_assignees").select("*, employees(id, name, sub_user_id)");
      return data || [];
    },
  });

  // Fetch profiles for created_by / solved_by display
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    tickets.forEach((t: any) => { if (t.created_by) ids.add(t.created_by); if (t.solved_by) ids.add(t.solved_by); });
    return Array.from(ids);
  }, [tickets]);

  const { data: profilesMap = {} } = useQuery({
    queryKey: ["ticket_profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: userIds.length > 0,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["support_categories_active"],
    queryFn: async () => {
      const { data } = await supabase.from("support_categories").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  // Employees with department
  const { data: employees = [] } = useQuery({
    queryKey: ["employees_active_with_dept"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name, department_id, sub_user_id, departments(name)")
        .eq("status", "active");
      return data || [];
    },
  });

  // Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments_active"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
  });

  // Resolve current employee record (for Start Working)
  const { data: currentEmployee } = useQuery({
    queryKey: ["current_employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("employees").select("id, sub_user_id").eq("sub_user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ["zones_active"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  // Search clients
  const { data: clientResults = [] } = useQuery({
    queryKey: ["client_search", clientSearch],
    queryFn: async () => {
      if (clientSearch.length < 2) return [];
      const { data } = await supabase.from("clients").select("id, name, client_id, contact, username, address, zone_id, billing_status, monthly_bill, mac_address, remote_address, zones(name)")
        .or(`name.ilike.%${clientSearch}%,client_id.ilike.%${clientSearch}%,username.ilike.%${clientSearch}%`)
        .limit(10);
      return data || [];
    },
    enabled: clientSearch.length >= 2,
  });

  // Comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["ticket_comments", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return [];
      const { data } = await supabase.from("support_ticket_comments").select("*, profiles(full_name)").eq("ticket_id", selectedTicketId).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedTicketId && conversationOpen,
  });

  // Summary stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = tickets.filter((t: any) => new Date(t.created_at).getMonth() === now.getMonth() && new Date(t.created_at).getFullYear() === now.getFullYear());
    return {
      total: thisMonth.length,
      pending: tickets.filter((t: any) => t.status === "pending").length,
      processing: tickets.filter((t: any) => t.status === "processing").length,
      pendingApproval: tickets.filter((t: any) => t.status === "pending_approval").length,
      solved: tickets.filter((t: any) => t.status === "solved").length,
    };
  }, [tickets]);

  // Create ticket
  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const ticketNo = `TKT-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from("support_tickets").insert({
        ticket_no: ticketNo,
        subject: ticketForm.subject,
        description: ticketForm.description || null,
        category_id: ticketForm.category_id || null,
        client_id: ticketForm.client_id || null,
        priority: ticketForm.priority,
        complain_no: ticketForm.complain_no || null,
        source: ticketForm.source,
        created_by: user?.id || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("নতুন টিকেট তৈরি হয়েছে");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      setNewTicketOpen(false);
      setTicketForm({ client_id: "", subject: "", description: "", category_id: "", priority: "medium", complain_no: "", source: "admin" });
      setClientSearch("");
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  // Assign employees → also moves ticket to processing + starts time tracking
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId) return;
      await supabase.from("support_ticket_assignees").delete().eq("ticket_id", selectedTicketId);
      if (selectedAssignees.length > 0) {
        const rows = selectedAssignees.map((eid) => ({ ticket_id: selectedTicketId, employee_id: eid }));
        const { error } = await supabase.from("support_ticket_assignees").insert(rows);
        if (error) throw error;
      }
      const update: any = {
        status: selectedAssignees.length > 0 ? "processing" : "pending",
        sms_notified: assignSms,
      };
      if (selectedAssignees.length > 0) update.processing_started_at = new Date().toISOString();
      await supabase.from("support_tickets").update(update).eq("id", selectedTicketId);
    },
    onSuccess: () => {
      toast.success("কর্মী নির্ধারণ হয়েছে");
      qc.invalidateQueries({ queryKey: ["ticket_assignees"] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      setAssignDialogOpen(false);
      setAssignSearch("");
      setAssignDept("");
    },
    onError: (e: any) => toast.error(e?.message || "সমস্যা হয়েছে"),
  });

  // Start working
  const startWorkingMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!currentEmployee?.id) throw new Error("Employee record not found for current user");
      const { error } = await supabase.from("support_tickets").update({
        work_started_at: new Date().toISOString(),
        work_started_by: currentEmployee.id,
      }).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Work started");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId || !newComment.trim()) return;
      const { error } = await supabase.from("support_ticket_comments").insert({
        ticket_id: selectedTicketId,
        user_id: user?.id || null,
        comment: newComment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("মন্তব্য যোগ হয়েছে");
      setNewComment("");
      refetchComments();
    },
  });

  // Delete ticket
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("টিকেট মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });

  // Resolve / mark for approval. Employees → pending_approval, admins → solved directly.
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const t = tickets.find((x: any) => x.id === id);
      const clientOnline = (t?.clients as any)?.is_online ?? null;
      const goPendingApproval = isEmployee && !isAdmin;
      const payload: any = goPendingApproval
        ? {
            status: "pending_approval",
            pending_approval_at: new Date().toISOString(),
            pending_approval_by: user?.id || null,
            resolution_note: resolutionNote || null,
            client_online_at_solve: clientOnline,
          }
        : {
            status: "solved",
            solved_at: new Date().toISOString(),
            solved_by: user?.id || null,
            approved_by: user?.id || null,
            approved_at: new Date().toISOString(),
            resolution_note: resolutionNote || null,
            client_online_at_solve: clientOnline,
          };
      const { error } = await supabase.from("support_tickets").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isEmployee && !isAdmin ? "অনুমোদনের জন্য পাঠানো হয়েছে" : "টিকেট সমাধান হয়েছে");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      setSolveDialogOpen(false);
      setSolveTicket(null);
      setResolutionNote("");
    },
  });

  // Approve a pending_approval ticket → solved
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").update({
        status: "solved",
        solved_at: new Date().toISOString(),
        solved_by: user?.id || null,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অনুমোদিত — টিকেট সমাধান");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });

  // Reject pending_approval → back to processing
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").update({
        status: "processing",
        pending_approval_at: null,
        pending_approval_by: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অনুমোদন বাতিল — টিকেট পুনরায় চালু");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });

  const openAssign = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const current = allAssignees.filter((a: any) => a.ticket_id === ticketId).map((a: any) => a.employee_id);
    setSelectedAssignees(current);
    setAssignDept("");
    setAssignSearch("");
    setAssignSms(true);
    setAssignDialogOpen(true);
  };

  const openConversation = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setConversationOpen(true);
  };

  const selectClient = (client: any) => {
    setTicketForm({ ...ticketForm, client_id: client.id, subject: ticketForm.subject });
    setClientSearch(client.name + " (" + client.client_id + ")");
  };

  const filtered = tickets.filter((t: any) => {
    if (tab === "bw" && t.source !== "bw_reseller") return false;
    if (tab === "mac" && t.source !== "reseller") return false;
    if (tab === "pending" && t.status !== "pending") return false;
    if (tab === "approval" && t.status !== "pending_approval") return false;
    if (tab === "accepted" && (t.source === "bw_reseller" || t.source === "reseller")) return false;
    if (myOnly && user?.id) {
      const mine = t.created_by === user.id || allAssignees.some((a: any) => a.ticket_id === t.id && (a.employees as any)?.sub_user_id === user.id);
      if (!mine) return false;
    }
    return (
      t.ticket_no?.toLowerCase().includes(search.toLowerCase()) ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      (t.clients as any)?.name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const priorityColor = (p: string) => {
    if (p === "high") return "destructive";
    if (p === "low") return "secondary";
    return "default";
  };

  const statusClass = (s: string) => {
    if (s === "solved") return "bg-green-600 text-white hover:bg-green-700";
    if (s === "processing") return "bg-orange-500 text-white hover:bg-orange-600 cursor-pointer";
    if (s === "pending_approval") return "bg-purple-600 text-white hover:bg-purple-700";
    return "bg-yellow-500 text-white hover:bg-yellow-600";
  };

  const openSolveDialog = (t: any) => {
    setSolveTicket(t);
    setResolutionNote(t.resolution_note || "");
    setSolveDialogOpen(true);
  };

  // Filtered employee list for assign dialog
  const filteredEmployees = useMemo(() => {
    return (employees as any[]).filter((e: any) => {
      if (assignDept && e.department_id !== assignDept) return false;
      if (assignSearch && !e.name?.toLowerCase().includes(assignSearch.toLowerCase())) return false;
      return true;
    });
  }, [employees, assignDept, assignSearch]);

  const toggleAssignee = (id: string) => {
    setSelectedAssignees((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">ক্লায়েন্ট সাপোর্ট</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/dashboard/support/categories"><FolderOpen className="h-4 w-4 mr-1" />ক্যাটাগরি ম্যানেজ</Link></Button>
          <Button onClick={() => setNewTicketOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" />নতুন টিকেট খুলুন</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TicketCheck className="h-8 w-8 text-primary" />
          <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">মোট টিকেট (এই মাসে)</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-orange-500" />
          <div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">পেন্ডিং টিকেট</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <div><p className="text-2xl font-bold">{stats.processing}</p><p className="text-xs text-muted-foreground">প্রসেসিং টিকেট</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div><p className="text-2xl font-bold">{stats.solved}</p><p className="text-xs text-muted-foreground">সমাধান টিকেট</p></div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="accepted">Accepted (Client's)</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approval">Approval ({stats.pendingApproval})</TabsTrigger>
          <TabsTrigger value="mac">MAC Reseller's</TabsTrigger>
          <TabsTrigger value="bw">Bandwidth POP's</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">টিকেট তালিকা</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant={myOnly ? "default" : "outline"} size="sm" className="h-9" onClick={() => setMyOnly(!myOnly)}>
                <Users className="h-4 w-4 mr-1" />My Tickets
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>টিকেট নং</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>ক্লায়েন্ট কোড</TableHead>
                  <TableHead>কাস্টমার</TableHead>
                  <TableHead>মোবাইল</TableHead>
                  <TableHead>কমপ্লেইন নং</TableHead>
                  <TableHead>জোন</TableHead>
                  <TableHead>সমস্যা</TableHead>
                  <TableHead>প্রায়োরিটি</TableHead>
                  <TableHead>সময়</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>Assign To</TableHead>
                  <TableHead>Solved By</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-32">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={15} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={15} className="text-center py-8">কোনো টিকেট পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((t: any) => {
                  const ticketAssignees = allAssignees.filter((a: any) => a.ticket_id === t.id);
                  const createdByName = t.source === "client"
                    ? ((t.clients as any)?.name || "Client")
                    : (profilesMap[t.created_by] || "—");
                  const createdByLabel = t.source === "client" ? "Client" : "Staff";
                  const solvedByName = t.solved_by ? (profilesMap[t.solved_by] || "—") : null;
                  const isAssignedToMe = !!currentEmployee && ticketAssignees.some((a: any) => a.employee_id === currentEmployee.id);
                  const canStart = t.status === "processing" && !t.work_started_at && isAssignedToMe;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.ticket_no}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span>{createdByName}</span>
                          <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 mt-0.5">{createdByLabel}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{(t.clients as any)?.client_id || "—"}</TableCell>
                      <TableCell>{(t.clients as any)?.name || "—"}</TableCell>
                      <TableCell>{(t.clients as any)?.contact || "—"}</TableCell>
                      <TableCell>{t.complain_no || "—"}</TableCell>
                      <TableCell>{(t.zones as any)?.name || "—"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{t.subject}</TableCell>
                      <TableCell><Badge variant={priorityColor(t.priority || "medium")}>{t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Medium"}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(t.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={statusClass(t.status)}
                            onClick={t.status === "processing" ? () => openSolveDialog(t) : undefined}
                          >
                            {t.status}
                          </Badge>
                          {t.status === "processing" && t.processing_started_at && (
                            <LiveElapsed start={t.processing_started_at} className="font-mono text-[10px] text-orange-600" />
                          )}
                          {t.status === "solved" && t.processing_started_at && t.solved_at && (
                            <span className="text-[10px] text-muted-foreground">{formatDuration(t.processing_started_at, t.solved_at)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {ticketAssignees.length > 0 ? ticketAssignees.map((a: any) => (
                            <Badge key={a.id} variant="secondary" className="text-[10px] px-1.5 py-0">{(a.employees as any)?.name}</Badge>
                          )) : null}
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={() => openAssign(t.id)}>
                            <Users className="h-3 w-3 mr-1" />{ticketAssignees.length > 0 ? "Edit" : "Assign"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {solvedByName ? (
                          <div className="flex flex-col">
                            <span>{solvedByName}</span>
                            {t.solved_at && <span className="text-muted-foreground text-[10px]">{format(new Date(t.solved_at), "dd/MM/yy HH:mm")}</span>}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.work_started_at && t.status !== "solved" ? (
                          <LiveElapsed start={t.work_started_at} className="font-mono text-blue-600" />
                        ) : formatDuration(t.created_at, t.solved_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          {canStart && (
                            <Button size="sm" className="h-7 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white" onClick={() => startWorkingMutation.mutate(t.id)}>
                              <Play className="h-3 w-3 mr-1" />Start
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openConversation(t.id)}><MessageSquare className="h-4 w-4" /></Button>
                          {t.status !== "solved" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSolveDialog(t)}><CheckCircle2 className="h-4 w-4 text-green-500" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>নতুন সাপোর্ট টিকেট</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ক্লায়েন্ট সার্চ (Username / ID)</Label>
              <Input value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setTicketForm({ ...ticketForm, client_id: "" }); }} placeholder="ক্লায়েন্ট খুঁজুন..." />
              {clientResults.length > 0 && !ticketForm.client_id && (
                <div className="border rounded-md mt-1 max-h-40 overflow-y-auto bg-background">
                  {clientResults.map((c: any) => (
                    <div key={c.id} className="px-3 py-2 hover:bg-muted cursor-pointer text-sm" onClick={() => selectClient(c)}>
                      <span className="font-medium">{c.name}</span> — {c.client_id} — {c.contact || "N/A"}
                    </div>
                  ))}
                </div>
              )}
              {ticketForm.client_id && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-md">
                  {clientResults.filter((c: any) => c.id === ticketForm.client_id).map((c: any) => (
                    <div key={c.id} className="col-span-2 grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">নাম:</span> {c.name}</div>
                      <div><span className="text-muted-foreground">মোবাইল:</span> {c.contact || "—"}</div>
                      <div><span className="text-muted-foreground">ঠিকানা:</span> {c.address || "—"}</div>
                      <div><span className="text-muted-foreground">জোন:</span> {(c.zones as any)?.name || "—"}</div>
                      <div><span className="text-muted-foreground">বিলিং স্ট্যাটাস:</span> {c.billing_status || "—"}</div>
                      <div><span className="text-muted-foreground">মাসিক বিল:</span> {c.monthly_bill || "—"}</div>
                      <div><span className="text-muted-foreground">MAC:</span> {c.mac_address || "—"}</div>
                      <div><span className="text-muted-foreground">IP:</span> {c.remote_address || "—"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>সমস্যার ক্যাটাগরি</Label>
                <Select value={ticketForm.category_id} onValueChange={(v) => setTicketForm({ ...ticketForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="ক্যাটাগরি নির্বাচন" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>প্রায়োরিটি</Label>
                <Select value={ticketForm.priority} onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>সমস্যার বিবরণ (Subject) *</Label>
              <Input value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder="সমস্যা লিখুন" />
            </div>
            <div>
              <Label>কমপ্লেইন নম্বর</Label>
              <Input value={ticketForm.complain_no} onChange={(e) => setTicketForm({ ...ticketForm, complain_no: e.target.value })} placeholder="ফোন নম্বর" />
            </div>
            <div>
              <Label>বিস্তারিত / মন্তব্য</Label>
              <Textarea value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="বিস্তারিত লিখুন..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTicketOpen(false)}>বাতিল</Button>
            <Button onClick={() => createTicketMutation.mutate()} disabled={!ticketForm.subject || createTicketMutation.isPending}>
              {createTicketMutation.isPending ? "তৈরি হচ্ছে..." : "টিকেট তৈরি করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Solvers Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Solvers</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Department</Label>
              <Select value={assignDept || "_all"} onValueChange={(v) => setAssignDept(v === "_all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Employee</Label>
              <div className="border rounded-md p-2 min-h-[44px]">
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedAssignees.map((id) => {
                    const emp: any = (employees as any[]).find((e: any) => e.id === id);
                    if (!emp) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        <span>{emp.name}</span>
                        <button onClick={() => toggleAssignee(id)} className="hover:bg-muted-foreground/20 rounded">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <Input
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="কর্মী খুঁজুন..."
                  className="h-8 border-0 focus-visible:ring-0 px-1"
                />
              </div>
              {(assignSearch || assignDept) && (
                <ScrollArea className="max-h-48 mt-1 border rounded-md">
                  <div className="p-1">
                    {filteredEmployees.length === 0 ? (
                      <div className="text-xs text-center text-muted-foreground py-3">কর্মী পাওয়া যায়নি</div>
                    ) : filteredEmployees.slice(0, 50).map((emp: any) => {
                      const isSel = selectedAssignees.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleAssignee(emp.id)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-muted ${isSel ? "bg-muted" : ""}`}
                        >
                          <span>{emp.name}</span>
                          <span className="text-[10px] text-muted-foreground">{(emp.departments as any)?.name || ""}</span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            <label className="flex items-center gap-2 justify-end text-sm">
              <Checkbox checked={assignSms} onCheckedChange={(c) => setAssignSms(!!c)} />
              <span>SMS</span>
            </label>
          </div>
          <DialogFooter className="flex !justify-end gap-2">
            <Button variant="destructive" onClick={() => setAssignDialogOpen(false)} className="px-8">No</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white px-8">
              {assignMutation.isPending ? "..." : "Yes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation Dialog */}
      <Dialog open={conversationOpen} onOpenChange={setConversationOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader><DialogTitle>টিকেট আলোচনা</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[40vh] border rounded-md p-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">কোনো আলোচনা নেই</p>
            ) : comments.map((c: any) => (
              <div key={c.id} className="mb-3 pb-3 border-b last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{(c.profiles as any)?.full_name || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yy HH:mm")}</span>
                </div>
                <p className="text-sm mt-1">{c.comment}</p>
              </div>
            ))}
          </ScrollArea>
          <div className="space-y-2">
            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="আপনার মন্তব্য লিখুন..." rows={3} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => refetchComments()} size="sm">রিফ্রেশ</Button>
              <Button onClick={() => addCommentMutation.mutate()} disabled={!newComment.trim() || addCommentMutation.isPending} size="sm">
                <Send className="h-4 w-4 mr-1" />মন্তব্য পাঠান
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Solve Confirmation Dialog */}
      <Dialog open={solveDialogOpen} onOpenChange={setSolveDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Press Yes if solved</DialogTitle></DialogHeader>
          {solveTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">CONNECTIVITY STATUS</Label>
                  <Input readOnly value={(solveTicket.clients as any)?.billing_status === "active" ? "Connected" : "Disconnected"} />
                </div>
                <div>
                  <Label className="text-xs">STATUS</Label>
                  <Input readOnly value={solveTicket.status === "processing" ? "Offline" : "Online"} className="bg-destructive/10" />
                </div>
                <div>
                  <Label className="text-xs">UPTIME</Label>
                  <Input readOnly value="" placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs">LAST LOGOUT TIME</Label>
                  <Input readOnly value={format(new Date(), "dd/MM/yyyy hh:mm a")} />
                </div>
                <div>
                  <Label className="text-xs">MAC ADDRESS / CALLER ID</Label>
                  <Input readOnly value={(solveTicket.clients as any)?.mac_address || ""} />
                </div>
                <div>
                  <Label className="text-xs">IP ADDRESS</Label>
                  <Input readOnly value={(solveTicket.clients as any)?.remote_address || ""} />
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
                <div><strong>টিকেট:</strong> {solveTicket.ticket_no} — {solveTicket.subject}</div>
                <div><strong>ক্লায়েন্ট:</strong> {(solveTicket.clients as any)?.name || "—"}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => setSolveDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => solveTicket && resolveMutation.mutate(solveTicket.id)}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? "সেভ হচ্ছে..." : "Yes, Solved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
