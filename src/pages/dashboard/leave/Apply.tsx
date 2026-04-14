import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Calendar, Clock } from "lucide-react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "outline" },
  approved: { label: "অনুমোদিত", variant: "default" },
  rejected: { label: "প্রত্যাখ্যাত", variant: "destructive" },
};

export default function Apply() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ category_id: "", start_date: "", end_date: "", reason: "" });

  // Find employee linked to current user
  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: async () => {
      if (!user) return null;
      // Try to find employee by email match
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
      return data;
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
      return data;
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
      return data;
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

      // Check balance
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
        <Clock className="h-10 w-10" />
        <p>আপনার ইমেইলের সাথে কোনো কর্মী প্রোফাইল পাওয়া যায়নি।</p>
        <p className="text-xs">অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">লিভ আবেদন</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> নতুন আবেদন</Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {balances.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{b.leave_categories?.name}</p>
              <p className="text-2xl font-bold text-foreground">{b.remaining_days}</p>
              <p className="text-xs text-muted-foreground">/ {b.total_days} দিন</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications list */}
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

      {/* Apply dialog */}
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
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
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
