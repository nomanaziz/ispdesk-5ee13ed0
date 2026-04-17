import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserX } from "lucide-react";

export default function DeleteUser() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: devices = [] } = useQuery({
    queryKey: ["device_admin_inventory_simple_del"],
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
  });

  const key = (d: any) => `${d.type}:${d.id}`;
  const toggle = (d: any) => {
    const k = key(d);
    const n = new Set(selected);
    n.has(k) ? n.delete(k) : n.add(k);
    setSelected(n);
  };

  const del = useMutation({
    mutationFn: async () => {
      if (!username) throw new Error("Username দিন");
      if (selected.size === 0) throw new Error("কমপক্ষে ১টা ডিভাইস সিলেক্ট করুন");
      const targets = devices.filter((d: any) => selected.has(key(d))).map((d: any) => ({ type: d.type, id: d.id, name: d.name }));
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("device_admin_deploy_jobs").insert({
        job_type: "delete_user",
        username,
        target_devices: targets,
        status: "pending",
        created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_admin_dashboard"] });
      toast.success("ডিলিট জব তৈরি হয়েছে");
      setUsername(""); setSelected(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <UserX className="h-6 w-6 text-destructive" /> বাল্ক ইউজার ডিলিট
      </h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Username সার্চ করে ডিভাইস সিলেক্ট করুন</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="যে username ডিলিট করবেন..." value={username} onChange={(e) => setUsername(e.target.value)} />
          <div className="border border-border rounded max-h-96 overflow-auto">
            {devices.map((d: any) => (
              <label key={key(d)} className="flex items-center gap-3 p-2 border-b border-border hover:bg-muted/50 cursor-pointer">
                <Checkbox checked={selected.has(key(d))} onCheckedChange={() => toggle(d)} />
                <Badge variant="outline" className="text-xs">{d.type}</Badge>
                <span className="font-medium">{d.name}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{selected.size} ডিভাইস সিলেক্টেড</span>
            <Button variant="destructive" onClick={() => { if (confirm(`"${username}" সকল সিলেক্টেড ডিভাইস থেকে ডিলিট করবেন?`)) del.mutate(); }} disabled={del.isPending}>
              ডিলিট করুন
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
