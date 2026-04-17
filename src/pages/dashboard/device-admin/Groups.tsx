import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Users2 } from "lucide-react";

export default function DeviceGroups() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["device_admin_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_admin_groups")
        .select("*, device_admin_group_members(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("নাম আবশ্যক");
      if (editing) {
        const { error } = await supabase.from("device_admin_groups").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("device_admin_groups").insert({ ...form, created_by: u.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_groups"] });
      toast.success("সংরক্ষিত হয়েছে");
      setOpen(false); setEditing(null); setForm({ name: "", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_admin_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["device_admin_groups"] }); toast.success("ডিলিট হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users2 className="h-6 w-6 text-primary" /> ইউজার / ডিভাইস গ্রুপ
        </h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", description: "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> নতুন গ্রুপ
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>বিবরণ</TableHead>
                <TableHead>ডিভাইস সংখ্যা</TableHead>
                <TableHead>তৈরি</TableHead>
                <TableHead className="w-24">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : groups.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো গ্রুপ নেই</TableCell></TableRow>
              ) : groups.map((g: any, i: number) => (
                <TableRow key={g.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.description || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{g.device_admin_group_members?.length ?? 0}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(g.created_at).toLocaleDateString("bn-BD")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(g); setForm({ name: g.name, description: g.description || "" }); setOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("ডিলিট করবেন?")) del.mutate(g.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "গ্রুপ এডিট" : "নতুন গ্রুপ"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: All Dhaka POPs" /></div>
            <div><Label>বিবরণ</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
