import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Shield, Eye, Edit, Crown } from "lucide-react";

type Device = { id: string; name: string; type: string; ip_address?: string };

export default function DeployUser() {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [user, setUser] = useState({ username: "", password: "", permission: "read" as "read" | "write" | "full" });

  const { data: devices = [] } = useQuery({
    queryKey: ["device_admin_inventory_simple"],
    queryFn: async () => {
      const [mk, olt, sw, zk] = await Promise.all([
        supabase.from("mikrotik_devices").select("id,name,ip_address"),
        supabase.from("olt_devices").select("id,name,ip_address"),
        supabase.from("pop_devices").select("id,name,ip_address"),
        supabase.from("zkteco_devices").select("id,name,ip_address"),
      ]);
      const all: Device[] = [
        ...(mk.data ?? []).map((d: any) => ({ ...d, type: "mikrotik" })),
        ...(olt.data ?? []).map((d: any) => ({ ...d, type: "olt" })),
        ...(sw.data ?? []).map((d: any) => ({ ...d, type: "switch" })),
        ...(zk.data ?? []).map((d: any) => ({ ...d, type: "zkteco" })),
      ];
      return all;
    },
  });

  const filtered = typeFilter === "all" ? devices : devices.filter((d) => d.type === typeFilter);
  const key = (d: Device) => `${d.type}:${d.id}`;
  const toggle = (d: Device) => {
    const k = key(d);
    const n = new Set(selected);
    n.has(k) ? n.delete(k) : n.add(k);
    setSelected(n);
  };
  const toggleAll = () => {
    if (filtered.every((d) => selected.has(key(d)))) {
      const n = new Set(selected);
      filtered.forEach((d) => n.delete(key(d)));
      setSelected(n);
    } else {
      const n = new Set(selected);
      filtered.forEach((d) => n.add(key(d)));
      setSelected(n);
    }
  };

  const deploy = useMutation({
    mutationFn: async () => {
      if (!user.username || !user.password) throw new Error("Username + password আবশ্যক");
      if (selected.size === 0) throw new Error("কমপক্ষে ১টা ডিভাইস সিলেক্ট করুন");
      const targets = devices.filter((d) => selected.has(key(d))).map((d) => ({ type: d.type, id: d.id, name: d.name }));
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("device_admin_deploy_jobs").insert({
        job_type: "deploy_user",
        username: user.username,
        password_hash: user.password,
        permission: user.permission,
        target_devices: targets,
        status: "pending",
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_dashboard"] });
      toast.success(`${selected.size} ডিভাইসে ডিপ্লয় জব তৈরি হয়েছে`);
      setStep(1); setSelected(new Set()); setUser({ username: "", password: "", permission: "read" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserPlus className="h-6 w-6 text-primary" /> বাল্ক ইউজার ডিপ্লয়
      </h1>

      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-2 rounded ${step >= s ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ধাপ ১: ডিভাইস সিলেক্ট করুন ({selected.size} সিলেক্টেড)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সকল</SelectItem>
                  <SelectItem value="mikrotik">MikroTik</SelectItem>
                  <SelectItem value="olt">OLT</SelectItem>
                  <SelectItem value="switch">Switch / POP</SelectItem>
                  <SelectItem value="zkteco">ZKTeco</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={toggleAll}>সব সিলেক্ট / আনসিলেক্ট</Button>
            </div>
            <div className="border border-border rounded max-h-96 overflow-auto">
              {filtered.map((d) => (
                <label key={key(d)} className="flex items-center gap-3 p-2 border-b border-border hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={selected.has(key(d))} onCheckedChange={() => toggle(d)} />
                  <Badge variant="outline" className="text-xs">{d.type}</Badge>
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">{d.ip_address}</span>
                </label>
              ))}
              {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">কোনো ডিভাইস নেই</div>}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={selected.size === 0}>পরবর্তী →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">ধাপ ২: ইউজার ডিটেইল</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username *</Label><Input value={user.username} onChange={(e) => setUser({ ...user, username: e.target.value })} /></div>
              <div><Label>Password *</Label><Input type="password" value={user.password} onChange={(e) => setUser({ ...user, password: e.target.value })} /></div>
            </div>
            <div>
              <Label>পার্মিশন</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {([
                  { v: "read", label: "Read", icon: Eye },
                  { v: "write", label: "Write", icon: Edit },
                  { v: "full", label: "Full", icon: Crown },
                ] as const).map((p) => (
                  <button key={p.v} type="button" onClick={() => setUser({ ...user, permission: p.v })}
                    className={`p-3 rounded border text-sm flex items-center justify-center gap-2 ${user.permission === p.v ? "border-primary bg-primary/10" : "border-border"}`}>
                    <p.icon className="h-4 w-4" /> {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← আগের</Button>
              <Button onClick={() => setStep(3)} disabled={!user.username || !user.password}>পরবর্তী →</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> ধাপ ৩: রিভিউ ও কনফার্ম</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Username:</span> <strong>{user.username}</strong></div>
              <div><span className="text-muted-foreground">Permission:</span> <Badge>{user.permission}</Badge></div>
              <div className="col-span-2"><span className="text-muted-foreground">Devices:</span> <strong>{selected.size}</strong></div>
            </div>
            <div className="border border-border rounded p-2 max-h-48 overflow-auto text-sm">
              {devices.filter((d) => selected.has(key(d))).map((d) => (
                <div key={key(d)} className="flex items-center gap-2 py-1">
                  <Badge variant="outline" className="text-xs">{d.type}</Badge>
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>← আগের</Button>
              <Button onClick={() => deploy.mutate()} disabled={deploy.isPending}>
                {deploy.isPending ? "চলছে..." : "ডিপ্লয় করুন"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
