import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { UserPlus, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "deploy" | "remove";
}

export function DeployUserDialog({ open, onOpenChange, mode }: Props) {
  const qc = useQueryClient();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [type, setType] = useState("all");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permission, setPermission] = useState("read");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: devices = [] } = useQuery({
    queryKey: ["device_admin_inventory_dialog"],
    queryFn: async () => {
      const [mk, olt, sw, zk] = await Promise.all([
        supabase.from("mikrotik_devices").select("id,name,ip_address"),
        supabase.from("olt_devices").select("id,name,ip_address"),
        supabase.from("pop_devices").select("id,name,ip_address"),
        supabase.from("zkteco_devices").select("id,name,ip_address"),
      ]);
      return [
        ...(mk.data ?? []).map((d: any) => ({ ...d, type: "mikrotik" })),
        ...(olt.data ?? []).map((d: any) => ({ ...d, type: "olt" })),
        ...(sw.data ?? []).map((d: any) => ({ ...d, type: "switch" })),
        ...(zk.data ?? []).map((d: any) => ({ ...d, type: "zkteco" })),
      ];
    },
    enabled: open && isAdmin,
  });

  const filtered = devices.filter((d: any) => type === "all" || d.type === type);
  const allSelected = filtered.length > 0 && filtered.every((d: any) => selected.has(`${d.type}:${d.id}`));

  const toggle = (key: string) => {
    const s = new Set(selected);
    s.has(key) ? s.delete(key) : s.add(key);
    setSelected(s);
  };

  const toggleAll = () => {
    const s = new Set(selected);
    if (allSelected) filtered.forEach((d: any) => s.delete(`${d.type}:${d.id}`));
    else filtered.forEach((d: any) => s.add(`${d.type}:${d.id}`));
    setSelected(s);
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!isAdmin) throw new Error("আপনার এই কাজের অনুমতি নেই");
      if (!username) throw new Error("Username দিন");
      if (mode === "deploy" && !password) throw new Error("Password দিন");
      if (selected.size === 0) throw new Error("অন্তত একটি ডিভাইস সিলেক্ট করুন");

      const targets = devices
        .filter((d: any) => selected.has(`${d.type}:${d.id}`))
        .map((d: any) => ({ type: d.type, id: d.id, name: d.name }));

      const { data: job, error } = await supabase.from("device_admin_deploy_jobs").insert({
        job_type: mode === "deploy" ? "deploy_user" : "delete_user",
        username,
        password_hash: mode === "deploy" ? password : null,
        permission: mode === "deploy" ? permission : null,
        target_devices: targets,
        status: "pending",
        created_by: user?.id,
      }).select("id").single();
      if (error) throw error;

      // Trigger executor
      const { data: result, error: fnErr } = await supabase.functions.invoke("process-deploy-job", {
        body: { job_id: job.id },
      });
      if (fnErr) throw fnErr;
      return result;
    },
    onSuccess: (result: any) => {
      const status = result?.status ?? "completed";
      const okCount = (result?.results ?? []).filter((r: any) => r.ok).length;
      const total = (result?.results ?? []).length;
      if (status === "completed") toast.success(`সফল: ${okCount}/${total} ডিভাইসে কাজ সম্পন্ন`);
      else if (status === "partial") toast.warning(`আংশিক সফল: ${okCount}/${total} ডিভাইসে কাজ সম্পন্ন`);
      else toast.error(`ব্যর্থ: কোনো ডিভাইসে কাজ হয়নি`);
      qc.invalidateQueries({ queryKey: ["device_admin_deploy_jobs"] });
      qc.invalidateQueries({ queryKey: ["device_admin_user_inventory"] });
      onOpenChange(false);
      setUsername(""); setPassword(""); setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {mode === "deploy" ? "বাল্ক ইউজার ডিপ্লয়" : "বাল্ক ইউজার রিমুভ"}
          </DialogTitle>
        </DialogHeader>

        {authLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !isAdmin ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>অনুমতি নেই</AlertTitle>
            <AlertDescription>
              You cannot use a user account with this permission. You have to upgrade your permission.
              <br />
              <span className="text-xs opacity-80">ইউজার ডিপ্লয়/রিমুভের জন্য Admin বা Super Admin role প্রয়োজন।</span>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Username *</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="noman" />
              </div>
              {mode === "deploy" && (
                <div>
                  <Label>Password *</Label>
                  <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
            </div>

            {mode === "deploy" && (
              <div>
                <Label>Permission</Label>
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="write">Write</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Label>ফিল্টার:</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">সকল</SelectItem>
                    <SelectItem value="mikrotik">MikroTik</SelectItem>
                    <SelectItem value="olt">OLT</SelectItem>
                    <SelectItem value="switch">Switch</SelectItem>
                    <SelectItem value="zkteco">ZKTeco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">{selected.size} সিলেক্টেড</Badge>
            </div>

            <div className="border rounded-md">
              <div className="flex items-center gap-2 p-2 bg-muted/50 border-b">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                <span className="text-sm font-medium">সব সিলেক্ট ({filtered.length})</span>
              </div>
              <ScrollArea className="h-[260px]">
                <div className="p-2 space-y-1">
                  {filtered.map((d: any) => {
                    const key = `${d.type}:${d.id}`;
                    return (
                      <label key={key} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer text-sm">
                        <Checkbox checked={selected.has(key)} onCheckedChange={() => toggle(key)} />
                        <Badge variant="outline" className="text-xs">{d.type}</Badge>
                        <span className="font-medium">{d.name}</span>
                        <span className="text-muted-foreground text-xs ml-auto font-mono">{d.ip_address}</span>
                      </label>
                    );
                  })}
                  {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">কোনো ডিভাইস নেই</div>}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          {isAdmin && (
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "deploy" ? "ডিপ্লয় করুন" : "রিমুভ করুন"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
