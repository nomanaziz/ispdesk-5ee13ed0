import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";

type Rule = { id: string; name: string; description: string | null; is_active: boolean };

export default function ResignRules() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true });

  const { data, isLoading } = useQuery({
    queryKey: ["resign_rules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("resign_rules").select("*").order("created_at");
      if (error) throw error;
      return (data || []) as any as Rule[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("নাম দিন");
      if (editing) {
        const { error } = await supabase.from("resign_rules")
          .update({ name: form.name, description: form.description, is_active: form.is_active } as any)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resign_rules")
          .insert({ name: form.name, description: form.description, is_active: form.is_active } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resign_rules"] });
      toast.success("সংরক্ষণ হয়েছে");
      setOpen(false);
      setEditing(null);
      setForm({ name: "", description: "", is_active: true });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resign_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resign_rules"] });
      toast.success("ডিলিট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (r: Rule) => {
      const { error } = await supabase.from("resign_rules").update({ is_active: !r.is_active } as any).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resign_rules"] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true });
    setOpen(true);
  };
  const openEdit = (r: Rule) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description || "", is_active: r.is_active });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পদত্যাগের নিয়ম</h1>
          <p className="text-sm text-muted-foreground">HR &amp; Payroll → Resign Rules</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> নতুন নিয়ম</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Resign Rules <Badge variant="secondary">{(data || []).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">সিরিয়াল</TableHead>
                    <TableHead>নিয়মের নাম</TableHead>
                    <TableHead>বিবরণ</TableHead>
                    <TableHead className="w-28">সক্রিয়</TableHead>
                    <TableHead className="w-32 text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data || []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">কোনো নিয়ম নেই</TableCell></TableRow>
                  )}
                  {(data || []).map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.description || "—"}</TableCell>
                      <TableCell><Switch checked={r.is_active} onCheckedChange={() => toggleActive.mutate(r)} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "নিয়ম এডিট করুন" : "নতুন নিয়ম"}</DialogTitle>
            <DialogDescription>Resign rule define করুন (যেমন All Salary Paid)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>নাম <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন All Asset Returned" />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="optional details" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>সক্রিয়</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
