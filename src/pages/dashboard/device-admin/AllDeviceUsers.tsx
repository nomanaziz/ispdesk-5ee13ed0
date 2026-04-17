import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Users, RefreshCw, Search, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

export default function AllDeviceUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: ["device_admin_user_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("device_admin_user_inventory")
        .select("*")
        .order("username");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("fetch-device-users", {});
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ইউজার লিস্ট রিফ্রেশ হয়েছে");
      qc.invalidateQueries({ queryKey: ["device_admin_user_inventory"] });
    },
    onError: (e: any) => toast.error(e.message ?? "রিফ্রেশ ব্যর্থ"),
  });

  const runDelete = async (username: string, targets: any[]) => {
    const { data: u } = await supabase.auth.getUser();
    const { data: job, error } = await supabase.from("device_admin_deploy_jobs").insert({
      job_type: "delete_user",
      username,
      target_devices: targets,
      status: "pending",
      created_by: u.user?.id,
    }).select("id").single();
    if (error) throw error;
    const { data: result, error: fnErr } = await supabase.functions.invoke("process-deploy-job", {
      body: { job_id: job.id },
    });
    if (fnErr) throw fnErr;
    return result;
  };

  const reportResult = (result: any, username: string) => {
    const okCount = (result?.results ?? []).filter((r: any) => r.ok).length;
    const total = (result?.results ?? []).length;
    if (result?.status === "completed") toast.success(`${username}: ${okCount}/${total} ডিভাইস থেকে ডিলিট সম্পন্ন`);
    else if (result?.status === "partial") toast.warning(`${username}: ${okCount}/${total} সফল`);
    else toast.error(`${username}: ডিলিট ব্যর্থ`);
    qc.invalidateQueries({ queryKey: ["device_admin_user_inventory"] });
  };

  const deleteFromAll = useMutation({
    mutationFn: async (username: string) => {
      const targets = data.filter((r: any) => r.username === username).map((r: any) => ({
        type: r.device_type, id: r.device_id, name: r.device_name,
      }));
      return { result: await runDelete(username, targets), username };
    },
    onSuccess: ({ result, username }) => reportResult(result, username),
    onError: (e: any) => toast.error(e.message),
  });

  const deletePerDevice = useMutation({
    mutationFn: async (row: any) => {
      return { result: await runDelete(row.username, [{ type: row.device_type, id: row.device_id, name: row.device_name }]), username: row.username };
    },
    onSuccess: ({ result, username }) => reportResult(result, username),
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    data.forEach((r: any) => {
      if (!map.has(r.username)) map.set(r.username, []);
      map.get(r.username)!.push(r);
    });
    return Array.from(map.entries())
      .filter(([u]) => !search || u.toLowerCase().includes(search.toLowerCase()))
      .map(([username, rows]) => ({ username, rows }));
  }, [data, search]);

  const toggleExpand = (u: string) => {
    const s = new Set(expanded);
    s.has(u) ? s.delete(u) : s.add(u);
    setExpanded(s);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> অল ডিভাইস ইউজার
        </h1>
        <Button onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refresh.isPending ? "animate-spin" : ""}`} />
          সব ডিভাইস থেকে রিফ্রেশ
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Username সার্চ করুন (যেমন: noman)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Username</TableHead>
                <TableHead>ডিভাইস সংখ্যা</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>সর্বশেষ সিঙ্ক</TableHead>
                <TableHead className="w-32">অ্যাকশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : grouped.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">কোনো ইউজার নেই — উপরে "রিফ্রেশ" ক্লিক করুন</TableCell></TableRow>
              ) : grouped.map(({ username, rows }) => {
                const isOpen = expanded.has(username);
                const perms = Array.from(new Set(rows.map((r: any) => r.permission).filter(Boolean)));
                const lastSync = rows.map((r: any) => new Date(r.last_synced_at).getTime()).sort((a, b) => b - a)[0];
                return (
                  <Collapsible key={username} asChild open={isOpen} onOpenChange={() => toggleExpand(username)}>
                    <>
                      <TableRow className="cursor-pointer" onClick={() => toggleExpand(username)}>
                        <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-semibold">{username}</TableCell>
                        <TableCell><Badge>{rows.length} ডিভাইস</Badge></TableCell>
                        <TableCell className="text-xs">
                          {perms.map((p: any) => <Badge key={p} variant="outline" className="mr-1">{p}</Badge>)}
                        </TableCell>
                        <TableCell className="text-xs">{lastSync ? new Date(lastSync).toLocaleString("bn-BD") : "—"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="destructive" onClick={() => { if (confirm(`${username} কে সব ডিভাইস থেকে ডিলিট করবেন?`)) deleteFromAll.mutate(username); }}>
                            <Trash2 className="h-3 w-3 mr-1" /> সব থেকে ডিলিট
                          </Button>
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="p-3 space-y-1">
                              {rows.map((r: any) => (
                                <div key={r.id} className="flex items-center gap-3 p-2 bg-background rounded border text-sm">
                                  <Badge variant="outline">{r.device_type}</Badge>
                                  <span className="font-medium">{r.device_name || "—"}</span>
                                  <Badge variant="secondary" className="ml-2">{r.permission || "—"}</Badge>
                                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.last_synced_at).toLocaleString("bn-BD")}</span>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(`এই ডিভাইস থেকে ডিলিট?`)) deletePerDevice.mutate(r); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
