import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, MessageSquare, CheckCircle, ListTodo, Clock, AlertTriangle, FolderOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};
const priorityLabels: Record<string, string> = { high: "জরুরি", medium: "মাঝারি", low: "সাধারণ" };
const statusLabels: Record<string, string> = { pending: "অপেক্ষমান", in_progress: "চলমান", completed: "সম্পন্ন", cancelled: "বাতিল" };
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function Tasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [commentDialogId, setCommentDialogId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [assignDialogId, setAssignDialogId] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", category_id: "", priority: "medium", due_date: "", remarks: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["task-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_categories").select("*").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("id, name, employee_id").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email");
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_categories(name)")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ["task-assignees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_assignees").select("*, employees(name)");
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["task-comments", commentDialogId],
    enabled: !!commentDialogId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", commentDialogId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload: any = {
        title: values.title,
        description: values.description || null,
        category_id: values.category_id || null,
        priority: values.priority,
        due_date: values.due_date || null,
        remarks: values.remarks || null,
      };
      if (editingId) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id || null;
        payload.status = "pending";
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(editingId ? "টাস্ক আপডেট হয়েছে" : "টাস্ক তৈরি হয়েছে");
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("টাস্ক মুছে ফেলা হয়েছে");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const payload: any = { status };
      if (status === "completed") payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from("tasks").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("task_comments").insert({
        task_id: commentDialogId!,
        user_id: user?.id || "",
        comment: newComment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-comments", commentDialogId] });
      setNewComment("");
      toast.success("মন্তব্য যোগ হয়েছে");
    },
  });

  const saveAssignMutation = useMutation({
    mutationFn: async () => {
      // Remove old, add new
      await supabase.from("task_assignees").delete().eq("task_id", assignDialogId!);
      if (selectedEmployees.length > 0) {
        const rows = selectedEmployees.map((eid) => ({ task_id: assignDialogId!, employee_id: eid }));
        const { error } = await supabase.from("task_assignees").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-assignees"] });
      toast.success("অ্যাসাইন আপডেট হয়েছে");
      setAssignDialogId(null);
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ title: "", description: "", category_id: "", priority: "medium", due_date: "", remarks: "" });
  };

  const openEdit = (task: any) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      category_id: task.category_id || "",
      priority: task.priority || "medium",
      due_date: task.due_date || "",
      remarks: task.remarks || "",
    });
    setDialogOpen(true);
  };

  const openAssign = (taskId: string) => {
    const current = assignees.filter((a) => a.task_id === taskId).map((a) => a.employee_id);
    setSelectedEmployees(current);
    setAssignDialogId(taskId);
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.full_name || p?.email || "—";
  };

  const getTaskAssignees = (taskId: string) =>
    assignees.filter((a) => a.task_id === taskId);

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <ListTodo className="h-8 w-8 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{tasks.length}</p>
          <p className="text-sm text-muted-foreground">মোট টাস্ক</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-1" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-sm text-muted-foreground">অপেক্ষমান</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{inProgressCount}</p>
          <p className="text-sm text-muted-foreground">চলমান</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold">{tasks.length - pendingCount - inProgressCount}</p>
          <p className="text-sm text-muted-foreground">অন্যান্য</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">টাস্ক ম্যানেজমেন্ট</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/dashboard/tasks/categories"><FolderOpen className="h-4 w-4 mr-1" />ক্যাটাগরি ম্যানেজ</Link></Button>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> নতুন টাস্ক
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="টাস্ক খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger><SelectValue placeholder="ক্যাটাগরি" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger><SelectValue placeholder="প্রায়োরিটি" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব প্রায়োরিটি</SelectItem>
                <SelectItem value="high">জরুরি</SelectItem>
                <SelectItem value="medium">মাঝারি</SelectItem>
                <SelectItem value="low">সাধারণ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
                <SelectItem value="pending">অপেক্ষমান</SelectItem>
                <SelectItem value="in_progress">চলমান</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>শিরোনাম</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead>প্রায়োরিটি</TableHead>
                  <TableHead>ডিউ ডেট</TableHead>
                  <TableHead>অ্যাসাইন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>তৈরিকারী</TableHead>
                  <TableHead className="w-36">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">কোনো টাস্ক পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((task, i) => {
                  const taskAssignees = getTaskAssignees(task.id);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{task.title}</TableCell>
                      <TableCell>{(task as any).task_categories?.name || "—"}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[task.priority || "medium"]}>
                          {priorityLabels[task.priority || "medium"]}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.due_date ? new Date(task.due_date).toLocaleDateString("bn-BD") : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => openAssign(task.id)}>
                          {taskAssignees.length > 0 ? (
                            <div className="flex -space-x-2">
                              {taskAssignees.slice(0, 3).map((a) => (
                                <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                                  <AvatarFallback className="text-[10px]">
                                    {(a as any).employees?.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {taskAssignees.length > 3 && (
                                <span className="text-xs text-muted-foreground ml-1">+{taskAssignees.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">অ্যাসাইন করুন</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={(v) => statusMutation.mutate({ id: task.id, status: v })}>
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <Badge className={statusColors[task.status]}>{statusLabels[task.status]}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">অপেক্ষমান</SelectItem>
                            <SelectItem value="in_progress">চলমান</SelectItem>
                            <SelectItem value="completed">সম্পন্ন</SelectItem>
                            <SelectItem value="cancelled">বাতিল</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{task.created_by ? getProfileName(task.created_by) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(task)} title="সম্পাদনা">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setCommentDialogId(task.id)} title="কথোপকথন">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(task.id)} title="মুছুন">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "টাস্ক সম্পাদনা" : "নতুন টাস্ক"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>শিরোনাম *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ক্যাটাগরি</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>প্রায়োরিটি</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">জরুরি</SelectItem>
                    <SelectItem value="medium">মাঝারি</SelectItem>
                    <SelectItem value="low">সাধারণ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>ডিউ ডেট</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>মন্তব্য</Label>
              <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending}>
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialogId} onOpenChange={(v) => !v && setAssignDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>কর্মী অ্যাসাইন করুন</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                  <Checkbox
                    checked={selectedEmployees.includes(emp.id)}
                    onCheckedChange={(checked) => {
                      setSelectedEmployees(
                        checked
                          ? [...selectedEmployees, emp.id]
                          : selectedEmployees.filter((id) => id !== emp.id)
                      );
                    }}
                  />
                  <span className="text-sm">{emp.name} ({emp.employee_id})</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogId(null)}>বাতিল</Button>
            <Button onClick={() => saveAssignMutation.mutate()} disabled={saveAssignMutation.isPending}>
              সেভ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={!!commentDialogId} onOpenChange={(v) => !v && setCommentDialogId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>কথোপকথন</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[350px] border rounded p-3">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">কোনো মন্তব্য নেই</p>
            ) : comments.map((c) => (
              <div key={c.id} className="mb-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">{getProfileName(c.user_id).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{getProfileName(c.user_id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString("bn-BD")}
                  </span>
                </div>
                <p className="text-sm ml-8 mt-1">{c.comment}</p>
                <Separator className="mt-2" />
              </div>
            ))}
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="মন্তব্য লিখুন..."
              rows={2}
              className="flex-1"
            />
            <Button onClick={() => commentMutation.mutate()} disabled={!newComment.trim() || commentMutation.isPending} className="self-end">
              পাঠান
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
