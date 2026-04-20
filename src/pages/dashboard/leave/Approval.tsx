import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Search, Eye, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "অপেক্ষমাণ", variant: "outline", color: "text-yellow-600" },
  approved: { label: "অনুমোদিত", variant: "default", color: "text-green-600" },
  rejected: { label: "প্রত্যাখ্যাত", variant: "destructive", color: "text-red-600" },
};

export default function Approval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [detailApp, setDetailApp] = useState<any>(null);
  const [remarks, setRemarks] = useState("");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["all-leave-applications", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("leave_applications")
        .select("*, employees(name, employee_id), leave_categories(name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approved" | "rejected" }) => {
      const app = applications.find((a: any) => a.id === id);
      if (!app) throw new Error("আবেদন পাওয়া যায়নি");

      // Update application status
      const { error } = await supabase.from("leave_applications").update({
        status: action,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        remarks: remarks || null,
      }).eq("id", id);
      if (error) throw error;

      // If approved, deduct from balance
      if (action === "approved" && app.days) {
        const currentYear = new Date(app.start_date).getFullYear();
        const { data: balance } = await supabase
          .from("leave_balances")
          .select("*")
          .eq("employee_id", app.employee_id)
          .eq("category_id", app.category_id)
          .eq("year", currentYear)
          .maybeSingle();

        if (balance) {
          const newUsed = (balance.used_days || 0) + app.days;
          const newRemaining = (balance.total_days || 0) - newUsed;
          await supabase.from("leave_balances").update({
            used_days: newUsed,
            remaining_days: Math.max(0, newRemaining),
          }).eq("id", balance.id);
        }
      }
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["all-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast.success(action === "approved" ? "লিভ অনুমোদিত হয়েছে" : "লিভ প্রত্যাখ্যাত হয়েছে");
      setDetailApp(null);
      setRemarks("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const counts = {
    pending: applications.filter((a: any) => statusFilter === "all" ? a.status === "pending" : true).length,
    total: applications.length,
  };

  const filtered = applications.filter((a: any) => {
    const name = a.employees?.name?.toLowerCase() || "";
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">লিভ অনুমোদন</h1>
        <Button asChild size="sm"><Link to="/dashboard/leave/apply"><Plus className="h-4 w-4 mr-1" />নতুন আবেদন</Link></Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
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
      </div>

      {/* Filters */}
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
              const s = statusConfig[a.status] || statusConfig.pending;
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

      {/* Detail dialog */}
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
