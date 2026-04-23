import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Search, Download, CheckCircle, XCircle, Clock, Eye, Undo2 } from "lucide-react";
import { toast } from "sonner";

const REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;       // 1 day → revert (back to in_progress)
const STATUS_CHANGE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // 2 days → status change allowed

function hoursLeft(completedAt: string | null, windowMs: number) {
  if (!completedAt) return 0;
  const elapsed = Date.now() - new Date(completedAt).getTime();
  return Math.max(0, windowMs - elapsed);
}

const statusLabels: Record<string, string> = { completed: "সম্পন্ন", cancelled: "বাতিল" };
const statusColors: Record<string, string> = { completed: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800" };
const priorityLabels: Record<string, string> = { high: "জরুরি", medium: "মাঝারি", low: "সাধারণ" };

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff < 0) return "—";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${days}দিন:${hours}ঘ:${mins}মি`;
}

export default function TaskHistory() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [detailTask, setDetailTask] = useState<any>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["task-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_categories(name)")
        .in("status", ["completed", "cancelled"])
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ["task-assignees-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_assignees").select("*, employees(name)");
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

  const { data: detailComments = [] } = useQuery({
    queryKey: ["task-comments-detail", detailTask?.id],
    enabled: !!detailTask,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", detailTask!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const getProfileName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.full_name || p?.email || "—";
  };

  const getTaskAssignees = (taskId: string) =>
    assignees.filter((a) => a.task_id === taskId);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const cancelledCount = tasks.filter((t) => t.status === "cancelled").length;

  // Average completion time
  const completedTasks = tasks.filter((t) => t.status === "completed" && t.completed_at);
  const avgMs = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()), 0) / completedTasks.length
    : 0;
  const avgDays = Math.floor(avgMs / 86400000);
  const avgHours = Math.floor((avgMs % 86400000) / 3600000);

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && t.category_id !== filterCategory) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["শিরোনাম", "ক্যাটাগরি", "প্রায়োরিটি", "তৈরির তারিখ", "সম্পন্নের তারিখ", "সময়কাল", "স্ট্যাটাস"];
    const rows = filtered.map((t) => [
      t.title,
      (t as any).task_categories?.name || "",
      priorityLabels[t.priority || "medium"],
      new Date(t.created_at).toLocaleDateString("bn-BD"),
      t.completed_at ? new Date(t.completed_at).toLocaleDateString("bn-BD") : "",
      formatDuration(t.created_at, t.completed_at),
      statusLabels[t.status],
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold">{completedCount}</p>
          <p className="text-sm text-muted-foreground">সম্পন্ন</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <XCircle className="h-8 w-8 mx-auto text-red-500 mb-1" />
          <p className="text-2xl font-bold">{cancelledCount}</p>
          <p className="text-sm text-muted-foreground">বাতিল</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-8 w-8 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{avgDays}দিন {avgHours}ঘ</p>
          <p className="text-sm text-muted-foreground">গড় সময়কাল</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">টাস্ক হিস্ট্রি</CardTitle>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> CSV এক্সপোর্ট
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="স্ট্যাটাস" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব</SelectItem>
                <SelectItem value="completed">সম্পন্ন</SelectItem>
                <SelectItem value="cancelled">বাতিল</SelectItem>
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
                  <TableHead>অ্যাসাইন</TableHead>
                  <TableHead>তৈরির তারিখ</TableHead>
                  <TableHead>সম্পন্নের তারিখ</TableHead>
                  <TableHead>সময়কাল</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead className="w-16">দেখুন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">কোনো হিস্ট্রি পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((task, i) => {
                  const taskAssignees = getTaskAssignees(task.id);
                  return (
                    <TableRow key={task.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{task.title}</TableCell>
                      <TableCell>{(task as any).task_categories?.name || "—"}</TableCell>
                      <TableCell>{priorityLabels[task.priority || "medium"]}</TableCell>
                      <TableCell>
                        <div className="flex -space-x-2">
                          {taskAssignees.slice(0, 3).map((a) => (
                            <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-[10px]">
                                {(a as any).employees?.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {taskAssignees.length > 3 && <span className="text-xs ml-1">+{taskAssignees.length - 3}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(task.created_at).toLocaleDateString("bn-BD")}</TableCell>
                      <TableCell>{task.completed_at ? new Date(task.completed_at).toLocaleDateString("bn-BD") : "—"}</TableCell>
                      <TableCell>{formatDuration(task.created_at, task.completed_at)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[task.status]}>{statusLabels[task.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDetailTask(task)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailTask} onOpenChange={(v) => !v && setDetailTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>টাস্ক বিবরণ</DialogTitle>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">শিরোনাম</p>
                <p className="font-medium">{detailTask.title}</p>
              </div>
              {detailTask.description && (
                <div>
                  <p className="text-sm text-muted-foreground">বিবরণ</p>
                  <p className="text-sm">{detailTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">প্রায়োরিটি</p>
                  <p>{priorityLabels[detailTask.priority || "medium"]}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">স্ট্যাটাস</p>
                  <Badge className={statusColors[detailTask.status]}>{statusLabels[detailTask.status]}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">তৈরির তারিখ</p>
                  <p>{new Date(detailTask.created_at).toLocaleString("bn-BD")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">সম্পন্নের তারিখ</p>
                  <p>{detailTask.completed_at ? new Date(detailTask.completed_at).toLocaleString("bn-BD") : "—"}</p>
                </div>
              </div>
              {detailTask.remarks && (
                <div>
                  <p className="text-sm text-muted-foreground">মন্তব্য</p>
                  <p className="text-sm">{detailTask.remarks}</p>
                </div>
              )}
              <Separator />
              <p className="text-sm font-medium">কথোপকথন</p>
              <ScrollArea className="max-h-[200px]">
                {detailComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">কোনো মন্তব্য নেই</p>
                ) : detailComments.map((c) => (
                  <div key={c.id} className="mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{getProfileName(c.user_id)}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("bn-BD")}</span>
                    </div>
                    <p className="text-sm ml-0 mt-0.5">{c.comment}</p>
                    <Separator className="mt-2" />
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
