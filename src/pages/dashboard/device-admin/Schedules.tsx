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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trash2, Clock, HardDrive, UserPlus, UserX } from "lucide-react";

const FREQ: Record<string, string> = {
  once: "",
  daily: "0 2 * * *",
  weekly: "0 2 * * 0",
  hourly: "0 * * * *",
  every_6h: "0 */6 * * *",
};

type ScheduleType = "backup" | "add_user" | "remove_user";

const TYPE_META: Record<ScheduleType, { label: string; icon: any; color: string }> = {
  backup: { label: "ব্যাকআপ", icon: HardDrive, color: "text-blue-600" },
  add_user: { label: "ইউজার অ্যাড", icon: UserPlus, color: "text-emerald-600" },
  remove_user: { label: "ইউজার রিমুভ", icon: UserX, color: "text-destructive" },
};

export default function Schedules() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("backup");
  const [form, setForm] = useState({
    name: "",
    frequency: "daily",
    group_id: "",
    device_type: "all",
    username: "",
    password: "",
    permission: "read",
    run_at: "",
    selectedDevices: new Set<string>(),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["device_admin_schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_admin_schedules")
        .select("*, device_admin_groups(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["device_admin_groups_simple"],
    queryFn: async () => (await supabase.from("device_admin_groups").select("id,name")).data ?? [],
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["device_admin_inventory_for_schedule"],
    queryFn: async () => {
      const [mk, olt, sw, zk] = await Promise.all([
        supabase.from("mikrotik_devices").select("id,name"),
        supabase.from("olt_devices").select("id,name"),
        supabase.from("pop_devices").select("id,name"),
        supabase.from("zkteco_devices").select("id,name"),
      ]);
      return [
        ...(mk.data ?? []).map((d: any) => ({ ...d, type: "mikrotik" })),
        ...(olt.data ?? []).map((d: any) => ({ ...d, type: "olt" })),
        ...(sw.data ?? []).map((d: any) => ({ ...d, type: "switch" })),
        ...(zk.data ?? []).map((d: any) => ({ ...d, type: "zkteco" })),
      ];
    },
    enabled: open && scheduleType !== "backup",
  });

  const reset = () => {
    setForm({
      name: "", frequency: "daily", group_id: "", device_type: "all",
      username: "", password: "", permission: "read", run_at: "",
      selectedDevices: new Set(),
    });
    setScheduleType("backup");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("নাম দিন");
      const { data: u } = await supabase.auth.getUser();

      const payload: any = {};
      if (scheduleType !== "backup") {
        if (!form.username) throw new Error("Username দিন");
        if (scheduleType === "add_user" && !form.password) throw new Error("Password দিন");
        if (form.selectedDevices.size === 0) throw new Error("ডিভাইস সিলেক্ট করুন");
        payload.username = form.username;
        if (scheduleType === "add_user") {
          payload.password = form.password;
          payload.permission = form.permission;
        }
        payload.target_devices = devices
          .filter((d: any) => form.selectedDevices.has(`${d.type}:${d.id}`))
          .map((d: any) => ({ type: d.type, id: d.id, name: d.name }));
        if (form.run_at) payload.run_at = form.run_at;
      }

      const { error } = await supabase.from("device_admin_schedules").insert({
        name: form.name,
        cron_expression: FREQ[form.frequency] || "0 2 * * *",
        frequency: form.frequency,
        schedule_type: scheduleType,
        payload,
        group_id: scheduleType === "backup" && form.group_id ? form.group_id : null,
        device_type: scheduleType === "backup" && form.device_type !== "all" ? form.device_type : null,
        enabled: true,
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_schedules"] });
      toast.success("শিডিউল তৈরি হয়েছে");
      setOpen(false);
      reset();
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

  const toggleDevice = (key: string) => {
    const s = new Set(form.selectedDevices);
    s.has(key) ? s.delete(key) : s.add(key);
    setForm({ ...form, selectedDevices: s });
  };

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
              <TableHead>টাইপ</TableHead>
              <TableHead>ফ্রিকোয়েন্সি</TableHead>
              <TableHead>টার্গেট</TableHead>
              <TableHead>পরবর্তী রান</TableHead>
              <TableHead>সক্রিয়</TableHead>
              <TableHead className="w-20">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">কোনো শিডিউল নেই</TableCell></TableRow>
            ) : schedules.map((s: any, i: number) => {
              const meta = TYPE_META[(s.schedule_type || "backup") as ScheduleType];
              const Icon = meta.icon;
              const targets = s.payload?.target_devices?.length;
              return (
                <TableRow key={s.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs ${meta.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.frequency || s.cron_expression}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {s.payload?.username ? `User: ${s.payload.username} (${targets || 0} ডিভাইস)` :
                      s.device_admin_groups?.name ? `গ্রুপ: ${s.device_admin_groups.name}` :
                      s.device_type ? `টাইপ: ${s.device_type}` : "সকল"}
                  </TableCell>
                  <TableCell className="text-xs">{s.next_run_at ? new Date(s.next_run_at).toLocaleString("bn-BD") : "—"}</TableCell>
                  <TableCell><Switch checked={s.enabled} onCheckedChange={(v) => toggle.mutate({ id: s.id, enabled: v })} /></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("ডিলিট?")) del.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>নতুন শিডিউল</DialogTitle></DialogHeader>

          <Tabs value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="backup"><HardDrive className="h-4 w-4 mr-1" /> ব্যাকআপ</TabsTrigger>
              <TabsTrigger value="add_user"><UserPlus className="h-4 w-4 mr-1" /> ইউজার অ্যাড</TabsTrigger>
              <TabsTrigger value="remove_user"><UserX className="h-4 w-4 mr-1" /> ইউজার রিমুভ</TabsTrigger>
            </TabsList>

            <div className="space-y-3 mt-4">
              <div><Label>শিডিউল নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: Daily MikroTik Backup" /></div>

              <div>
                <Label>ফ্রিকোয়েন্সি</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {scheduleType !== "backup" && <SelectItem value="once">একবার (নির্দিষ্ট তারিখে)</SelectItem>}
                    <SelectItem value="hourly">প্রতি ঘন্টা</SelectItem>
                    <SelectItem value="every_6h">প্রতি ৬ ঘন্টা</SelectItem>
                    <SelectItem value="daily">দৈনিক (রাত ২টা)</SelectItem>
                    <SelectItem value="weekly">সাপ্তাহিক (রবিবার ২টা)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.frequency === "once" && scheduleType !== "backup" && (
                <div>
                  <Label>চালানোর তারিখ ও সময়</Label>
                  <Input type="datetime-local" value={form.run_at} onChange={(e) => setForm({ ...form, run_at: e.target.value })} />
                </div>
              )}

              <TabsContent value="backup" className="space-y-3 m-0">
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
              </TabsContent>

              {(scheduleType === "add_user" || scheduleType === "remove_user") && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Username *</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="noman" /></div>
                    {scheduleType === "add_user" && (
                      <div><Label>Password *</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                    )}
                  </div>
                  {scheduleType === "add_user" && (
                    <div>
                      <Label>Permission</Label>
                      <Select value={form.permission} onValueChange={(v) => setForm({ ...form, permission: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read</SelectItem>
                          <SelectItem value="write">Write</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>টার্গেট ডিভাইস ({form.selectedDevices.size} সিলেক্টেড)</Label>
                    <ScrollArea className="h-[180px] border rounded-md p-2 mt-1">
                      <div className="space-y-1">
                        {devices.map((d: any) => {
                          const key = `${d.type}:${d.id}`;
                          return (
                            <label key={key} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                              <Checkbox checked={form.selectedDevices.has(key)} onCheckedChange={() => toggleDevice(key)} />
                              <Badge variant="outline" className="text-xs">{d.type}</Badge>
                              <span>{d.name}</span>
                            </label>
                          );
                        })}
                        {devices.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">ডিভাইস লোড হচ্ছে...</div>}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
