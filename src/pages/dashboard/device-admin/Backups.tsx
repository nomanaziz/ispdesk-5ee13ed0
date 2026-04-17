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
import { HardDrive, Download, Trash2, Play, Loader2, Info, Mail, Save } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSetting } from "@/hooks/useSystemSetting";

export default function BackupCenter() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [selectedDevs, setSelectedDevs] = useState<Set<string>>(new Set());
  const [formats, setFormats] = useState({ rsc: true, backup: true });

  // Email backup settings
  const { value: emailCfg, save: saveEmailCfg, isSaving } =
    useSystemSetting<{ enabled: boolean; to: string }>("backup_email", { enabled: false, to: "" });
  const [emailDraft, setEmailDraft] = useState<{ enabled: boolean; to: string } | null>(null);
  const cfg = emailDraft ?? emailCfg;

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["device_admin_backups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_admin_backups").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 8000,
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
    meta: { loadingMessage: "ব্যাকআপ চলছে — অপেক্ষা করুন..." },
    mutationFn: async () => {
      if (selectedDevs.size === 0) throw new Error("কমপক্ষে ১টা ডিভাইস সিলেক্ট করুন");
      const fmts = Object.entries(formats).filter(([, v]) => v).map(([k]) => k);
      if (fmts.length === 0) throw new Error("কমপক্ষে ১টা format সিলেক্ট করুন");

      const targets = devices.filter((d: any) => selectedDevs.has(key(d)));
      let ok = 0, fail = 0;

      for (const t of targets) {
        if (t.type === "mikrotik") {
          const { data, error } = await supabase.functions.invoke("backup-mikrotik-device", {
            body: { device_id: t.id, formats: fmts, triggered_by: "manual" },
          });
          if (error || !data?.success) fail++;
          else {
            const allOk = (data.results || []).every((r: any) => r.status === "completed");
            allOk ? ok++ : fail++;
          }
        } else {
          // OLT/Switch placeholder
          await supabase.from("device_admin_backups").insert({
            device_type: t.type, device_id: t.id, device_name: t.name,
            file_name: `${t.name}_placeholder.txt`, backup_format: "rsc",
            status: "failed", triggered_by: "manual",
            error_message: `${t.type} adapter not yet implemented`,
          });
          fail++;
        }
      }
      return { ok, fail };
    },
    onSuccess: ({ ok, fail }) => {
      qc.invalidateQueries({ queryKey: ["device_admin_backups"] });
      if (fail === 0) toast.success(`${ok} টি ডিভাইসের ব্যাকআপ সম্পন্ন`);
      else toast.warning(`${ok} সফল, ${fail} ব্যর্থ`);
      setSelectedDevs(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadBackup = async (b: any) => {
    if (!b.file_path) return toast.error("ফাইল পাওয়া যায়নি");
    const { data, error } = await supabase.storage.from("device-backups").createSignedUrl(b.file_path, 300);
    if (error || !data) return toast.error(error?.message || "ডাউনলোড লিঙ্ক তৈরি ব্যর্থ");
    window.open(data.signedUrl, "_blank");
  };

  const del = useMutation({
    mutationFn: async (b: any) => {
      if (b.file_path) {
        await supabase.storage.from("device-backups").remove([b.file_path]);
      }
      const { error } = await supabase.from("device_admin_backups").delete().eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["device_admin_backups"] }); toast.success("ডিলিট হয়েছে"); },
  });

  const formatBytes = (b?: number) => {
    if (!b) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

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
                    <TableHead>ডিভাইস</TableHead>
                    <TableHead>ফাইল</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>সাইজ</TableHead>
                    <TableHead>উৎস</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="w-24">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                  ) : filteredBackups.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8">কোনো ব্যাকআপ নেই</TableCell></TableRow>
                  ) : filteredBackups.map((b: any, i: number) => (
                    <TableRow key={b.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="text-xs">{new Date(b.created_at).toLocaleString("bn-BD")}</TableCell>
                      <TableCell>{b.device_name} <Badge variant="outline" className="text-xs ml-1">{b.device_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{b.file_name}</TableCell>
                      <TableCell><Badge variant={b.backup_format === "rsc" ? "secondary" : "default"}>.{b.backup_format}</Badge></TableCell>
                      <TableCell className="text-xs">{formatBytes(b.file_size)}</TableCell>
                      <TableCell><Badge variant="secondary">{b.triggered_by}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant={b.status === "completed" ? "default" : "destructive"}>{b.status}</Badge>
                          {b.error_message && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs"><p className="text-xs">{b.error_message}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadBackup(b)} disabled={!b.file_path} title={!b.file_path && b.status === "completed" ? "Device-এ আছে — Winbox/FTP দিয়ে নিন" : "ডাউনলোড"}><Download className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("ডিলিট?")) del.mutate(b); }}><Trash2 className="h-4 w-4" /></Button>
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
              <div className="flex items-center gap-4 p-3 bg-muted/30 rounded">
                <span className="text-sm font-medium">ব্যাকআপ format:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formats.rsc} onCheckedChange={(v) => setFormats({ ...formats, rsc: !!v })} />
                  <code className="text-xs">.rsc</code> <span className="text-xs text-muted-foreground">(text export)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={formats.backup} onCheckedChange={(v) => setFormats({ ...formats, backup: !!v })} />
                  <code className="text-xs">.backup</code> <span className="text-xs text-muted-foreground">(binary)</span>
                </label>
              </div>
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
                  {runBackup.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                  ব্যাকআপ শুরু
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
