import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Clock } from "lucide-react";

const FREQ: Record<string, string> = {
  daily: "0 2 * * *",
  weekly: "0 2 * * 0",
  hourly: "0 * * * *",
  every_6h: "0 */6 * * *",
};

export default function Schedules() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", frequency: "daily", group_id: "", device_type: "all" });

  const { data: schedules = [] } = useQuery({
    queryKey: ["device_admin_schedules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_admin_schedules").select("*, device_admin_groups(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["device_admin_groups_simple"],
    queryFn: async () => (await supabase.from("device_admin_groups").select("id,name")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("নাম দিন");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("device_admin_schedules").insert({
        name: form.name,
        cron_expression: FREQ[form.frequency],
        frequency: form.frequency,
        group_id: form.group_id || null,
        device_type: form.device_type === "all" ? null : form.device_type,
        enabled: true,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_schedules"] });
      toast.success("শিডিউল তৈরি হয়েছে");
      setOpen(false); setForm({ name: "", frequency: "daily", group_id: "", device_type: "all" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("device_admin_schedules").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["device_admin_schedules"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_admin_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["device_admin_schedules"] }); toast.success("ডিলিট"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" /> শিডিউল ম্যানেজার
        </h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> নতুন শিডিউল</Button>
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>নাম</TableHead>
              <TableHead>ফ্রিকোয়েন্সি</TableHead>
              <TableHead>টার্গেট</TableHead>
              <TableHead>পরবর্তী রান</TableHead>
              <TableHead>সক্রিয়</TableHead>
              <TableHead className="w-20">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">কোনো শিডিউল নেই</TableCell></TableRow>
            ) : schedules.map((s: any, i: number) => (
              <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell><Badge variant="outline">{s.frequency || s.cron_expression}</Badge></TableCell>
                <TableCell className="text-sm">
                  {s.device_admin_groups?.name ? `গ্রুপ: ${s.device_admin_groups.name}` : s.device_type ? `টাইপ: ${s.device_type}` : "সকল"}
                </TableCell>
                <TableCell className="text-xs">{s.next_run_at ? new Date(s.next_run_at).toLocaleString("bn-BD") : "—"}</TableCell>
                <TableCell><Switch checked={s.enabled} onCheckedChange={(v) => toggle.mutate({ id: s.id, enabled: v })} /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("ডিলিট?")) del.mutate(s.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন ব্যাকআপ শিডিউল</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Daily MikroTik Backup" /></div>
            <div>
              <Label>ফ্রিকোয়েন্সি</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">প্রতি ঘন্টা</SelectItem>
                  <SelectItem value="every_6h">প্রতি ৬ ঘন্টা</SelectItem>
                  <SelectItem value="daily">দৈনিক (রাত ২টা)</SelectItem>
                  <SelectItem value="weekly">সাপ্তাহিক (রবিবার ২টা)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ডিভাইস টাইপ</Label>
              <Select value={form.device_type} onValueChange={(v) => setForm({ ...form, device_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল</SelectItem>
                  <SelectItem value="mikrotik">MikroTik</SelectItem>
                  <SelectItem value="olt">OLT</SelectItem>
                  <SelectItem value="switch">Switch / POP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {groups.length > 0 && (
              <div>
                <Label>গ্রুপ (ঐচ্ছিক)</Label>
                <Select value={form.group_id || "none"} onValueChange={(v) => setForm({ ...form, group_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">কোনোটি না</SelectItem>
                    {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
