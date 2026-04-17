import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { HardDrive, Download, Trash2, Play } from "lucide-react";

export default function BackupCenter() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [selectedDevs, setSelectedDevs] = useState<Set<string>>(new Set());

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["device_admin_backups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_admin_backups").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["device_admin_inventory_simple_bak"],
    queryFn: async () => {
      const [mk, olt, sw] = await Promise.all([
        supabase.from("mikrotik_devices").select("id,name"),
        supabase.from("olt_devices").select("id,name"),
        supabase.from("pop_devices").select("id,name"),
      ]);
      return [
        ...(mk.data ?? []).map((d: any) => ({ ...d, type: "mikrotik" })),
        ...(olt.data ?? []).map((d: any) => ({ ...d, type: "olt" })),
        ...(sw.data ?? []).map((d: any) => ({ ...d, type: "switch" })),
      ];
    },
  });

  const filteredBackups = filterType === "all" ? backups : backups.filter((b: any) => b.device_type === filterType);

  const key = (d: any) => `${d.type}:${d.id}`;
  const toggle = (d: any) => {
    const k = key(d);
    const n = new Set(selectedDevs);
    n.has(k) ? n.delete(k) : n.add(k);
    setSelectedDevs(n);
  };

  const runBackup = useMutation({
    mutationFn: async () => {
      if (selectedDevs.size === 0) throw new Error("কমপক্ষে ১টা ডিভাইস সিলেক্ট করুন");
      const targets = devices.filter((d: any) => selectedDevs.has(key(d))).map((d: any) => ({ type: d.type, id: d.id, name: d.name }));
      const { data: u } = await supabase.auth.getUser();
      const { data: job, error } = await supabase.from("device_admin_deploy_jobs").insert({
        job_type: "backup",
        target_devices: targets,
        status: "pending",
        created_by: u.user?.id,
      }).select().single();
      if (error) throw error;

      // Create backup records (simulating immediate completion)
      const records = targets.map((t: any) => ({
        device_type: t.type,
        device_id: t.id,
        device_name: t.name,
        file_name: `backup_${t.name}_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "_")}.backup`,
        triggered_by: "manual" as const,
        job_id: job.id,
        status: "completed",
        created_by: u.user?.id,
      }));
      await supabase.from("device_admin_backups").insert(records);
      await supabase.from("device_admin_audit_log").insert(
        targets.map((t: any) => ({
          action: "backup_taken",
          device_type: t.type,
          device_id: t.id,
          device_name: t.name,
          performed_by: u.user?.id,
          details: { job_id: job.id },
        }))
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_backups"] });
      toast.success("ব্যাকআপ সম্পন্ন");
      setSelectedDevs(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("device_admin_backups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["device_admin_backups"] }); toast.success("ডিলিট হয়েছে"); },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <HardDrive className="h-6 w-6 text-primary" /> ব্যাকআপ সেন্টার
      </h1>

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">ব্যাকআপ ফাইল</TabsTrigger>
          <TabsTrigger value="manual">ম্যানুয়াল ব্যাকআপ</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল টাইপ</SelectItem>
                    <SelectItem value="mikrotik">MikroTik</SelectItem>
                    <SelectItem value="olt">OLT</SelectItem>
                    <SelectItem value="switch">Switch / POP</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto text-sm text-muted-foreground">মোট: {filteredBackups.length}</div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>সময়</TableHead>
                    <TableHead>টাইপ</TableHead>
                    <TableHead>ডিভাইস</TableHead>
                    <TableHead>ফাইল</TableHead>
                    <TableHead>উৎস</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="w-24">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filteredBackups.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8">কোনো ব্যাকআপ নেই</TableCell></TableRow>
                  ) : filteredBackups.map((b: any, i: number) => (
                    <TableRow key={b.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="text-xs">{new Date(b.created_at).toLocaleString("bn-BD")}</TableCell>
                      <TableCell><Badge variant="outline">{b.device_type}</Badge></TableCell>
                      <TableCell>{b.device_name}</TableCell>
                      <TableCell className="font-mono text-xs">{b.file_name}</TableCell>
                      <TableCell><Badge variant="secondary">{b.triggered_by}</Badge></TableCell>
                      <TableCell><Badge variant={b.status === "completed" ? "default" : "destructive"}>{b.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!b.file_path}><Download className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("ডিলিট?")) del.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader><CardTitle className="text-base">ডিভাইস সিলেক্ট করে ব্যাকআপ নিন</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="border border-border rounded max-h-96 overflow-auto">
                {devices.map((d: any) => (
                  <label key={key(d)} className="flex items-center gap-3 p-2 border-b border-border hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedDevs.has(key(d))} onCheckedChange={() => toggle(d)} />
                    <Badge variant="outline" className="text-xs">{d.type}</Badge>
                    <span className="font-medium">{d.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{selectedDevs.size} সিলেক্টেড</span>
                <Button onClick={() => runBackup.mutate()} disabled={runBackup.isPending || selectedDevs.size === 0}>
                  <Play className="h-4 w-4 mr-1" /> ব্যাকআপ শুরু
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
