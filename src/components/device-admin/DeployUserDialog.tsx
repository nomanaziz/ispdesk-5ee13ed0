import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "deploy" | "remove";
}

export function DeployUserDialog({ open, onOpenChange, mode }: Props) {
  const qc = useQueryClient();
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
    enabled: open,
  });

  const filtered = devices.filter((d: any) => type === "all" || d.type === type);
  const allSelected = filtered.length > 0 && filtered.every((d: any) => selected.has(`${d.type}:${d.id}`));

  const toggle = (key: string) => {
    const s = new Set(selected);
    s.has(key) ? s.delete(key) : s.add(key);
    setSelected(s);
  };

  const toggleAll = () => {
    if (allSelected) {
      const s = new Set(selected);
      filtered.forEach((d: any) => s.delete(`${d.type}:${d.id}`));
      setSelected(s);
    } else {
      const s = new Set(selected);
      filtered.forEach((d: any) => s.add(`${d.type}:${d.id}`));
      setSelected(s);
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!username) throw new Error("Username দিন");
      if (mode === "deploy" && !password) throw new Error("Password দিন");
      if (selected.size === 0) throw new Error("অন্তত একটি ডিভাইস সিলেক্ট করুন");

      const targets = devices
        .filter((d: any) => selected.has(`${d.type}:${d.id}`))
        .map((d: any) => ({ type: d.type, id: d.id, name: d.name }));

      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("device_admin_deploy_jobs").insert({
        job_type: mode === "deploy" ? "deploy_user" : "delete_user",
        username,
        password_hash: mode === "deploy" ? password : null,
        permission: mode === "deploy" ? permission : null,
        target_devices: targets,
        status: "pending",
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selected.size} টি ডিভাইসে job তৈরি হয়েছে`);
      qc.invalidateQueries({ queryKey: ["device_admin_deploy_jobs"] });
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
            {mode === "deploy" ? "ডিপ্লয় করুন" : "রিমুভ করুন"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
