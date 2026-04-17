import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, MessageSquare, Pencil, Trash2, Users, TicketCheck, Clock, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d:${h}h:${m}m:${sec}s`;
}

export default function Tickets() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState("accepted");
  const [search, setSearch] = useState("");
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");

  // New ticket form
  const [ticketForm, setTicketForm] = useState({
    client_id: "", subject: "", description: "", category_id: "", priority: "medium", complain_no: "", source: "admin",
  });
  const [clientSearch, setClientSearch] = useState("");

  // Fetch tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, support_categories(name), clients(name, client_id, contact, username), zones(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch assignees for all tickets
  const { data: allAssignees = [] } = useQuery({
    queryKey: ["ticket_assignees"],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_assignees").select("*, employees(name)");
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["support_categories_active"],
    queryFn: async () => {
      const { data } = await supabase.from("support_categories").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees_active"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name").eq("status", "active");
      return data || [];
    },
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

  // Assign employees
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicketId) return;
      await supabase.from("support_ticket_assignees").delete().eq("ticket_id", selectedTicketId);
      if (selectedAssignees.length > 0) {
        const rows = selectedAssignees.map((eid) => ({ ticket_id: selectedTicketId, employee_id: eid }));
        const { error } = await supabase.from("support_ticket_assignees").insert(rows);
        if (error) throw error;
      }
      // Update status to processing
      await supabase.from("support_tickets").update({ status: "processing" }).eq("id", selectedTicketId);
    },
    onSuccess: () => {
      toast.success("কর্মী নির্ধারণ হয়েছে");
      qc.invalidateQueries({ queryKey: ["ticket_assignees", "support_tickets"] });
      setAssignDialogOpen(false);
    },
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

  // Resolve
  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_tickets").update({ status: "solved", solved_at: new Date().toISOString(), solved_by: user?.id || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("টিকেট সমাধান হয়েছে");
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    },
  });

  const openAssign = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    const current = allAssignees.filter((a: any) => a.ticket_id === ticketId).map((a: any) => a.employee_id);
    setSelectedAssignees(current);
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
    if (tab === "accepted" && (t.source === "bw_reseller" || t.source === "reseller")) return false;
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

  const statusColor = (s: string) => {
    if (s === "solved") return "default";
    if (s === "processing") return "secondary";
    return "outline";
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">ক্লায়েন্ট সাপোর্ট</h1>
        <Button onClick={() => setNewTicketOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" />নতুন টিকেট খুলুন</Button>
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
          <TabsTrigger value="mac">MAC Reseller's</TabsTrigger>
          <TabsTrigger value="bw">Bandwidth POP's</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">টিকেট তালিকা</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>টিকেট নং</TableHead>
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
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-28">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={13} className="text-center py-8">কোনো টিকেট পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((t: any) => {
                  const ticketAssignees = allAssignees.filter((a: any) => a.ticket_id === t.id);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.ticket_no}</TableCell>
                      <TableCell>{(t.clients as any)?.client_id || "—"}</TableCell>
                      <TableCell>{(t.clients as any)?.name || "—"}</TableCell>
                      <TableCell>{(t.clients as any)?.contact || "—"}</TableCell>
                      <TableCell>{t.complain_no || "—"}</TableCell>
                      <TableCell>{(t.zones as any)?.name || "—"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{t.subject}</TableCell>
                      <TableCell><Badge variant={priorityColor(t.priority || "medium")}>{t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Medium"}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(t.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell><Badge variant={statusColor(t.status)}>{t.status}</Badge></TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAssign(t.id)}>
                          <Users className="h-3 w-3 mr-1" />
                          {ticketAssignees.length > 0 ? ticketAssignees.map((a: any) => (a.employees as any)?.name).join(", ") : "Assign"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs">{formatDuration(t.created_at, t.solved_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openConversation(t.id)}><MessageSquare className="h-4 w-4" /></Button>
                          {t.status !== "solved" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => resolveMutation.mutate(t.id)}><CheckCircle2 className="h-4 w-4 text-green-500" /></Button>
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

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>কর্মী নির্ধারণ করুন</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {employees.map((emp: any) => (
                <label key={emp.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={selectedAssignees.includes(emp.id)}
                    onCheckedChange={(checked) => {
                      setSelectedAssignees(checked ? [...selectedAssignees, emp.id] : selectedAssignees.filter((id) => id !== emp.id));
                    }}
                  />
                  <span className="text-sm">{emp.name}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>বাতিল</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending}>সেভ করুন</Button>
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
    </div>
  );
}
