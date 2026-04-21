import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Wifi, UserCheck, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PopActionMenu from "@/components/branches/PopActionMenu";
import FundDeductionDialog from "@/components/branches/FundDeductionDialog";
import PasswordRegenerateDialog from "@/components/branches/PasswordRegenerateDialog";

export default function Managers() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [filterFundStart, setFilterFundStart] = useState<string>("all");
  const [filterPopType, setFilterPopType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [fundPop, setFundPop] = useState<any>(null);
  const [pwdPop, setPwdPop] = useState<any>(null);

  const { data: managers, isLoading } = useQuery({
    queryKey: ["branch-managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_managers")
        .select("*, reseller_tariffs(name), branches(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clientData } = useQuery({
    queryKey: ["pop-client-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("branch_id, billing_status, is_online");
      const map: Record<string, { running: number; enabled: number; disabled: number; left: number; online: number }> = {};
      for (const c of data ?? []) {
        const bid = (c as any).branch_id;
        if (!bid) continue;
        if (!map[bid]) map[bid] = { running: 0, enabled: 0, disabled: 0, left: 0, online: 0 };
        map[bid].running++;
        const st = (c as any).billing_status;
        if (st === "active" || st === "enabled") map[bid].enabled++;
        else if (st === "disabled" || st === "expired") map[bid].disabled++;
        else if (st === "left") map[bid].left++;
        if ((c as any).is_online) map[bid].online++;
      }
      return { map };
    },
  });
  const clientCounts = clientData?.map;

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("branch_managers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("branch_managers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      toast.success("POP মুছে ফেলা হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (managers ?? []).filter((m: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !(m.name?.toLowerCase().includes(q) ||
            m.username?.toLowerCase().includes(q) ||
            m.pop_code?.toLowerCase().includes(q) ||
            m.contact?.toLowerCase().includes(q))
        ) return false;
      }
      if (filterFundStart !== "all" && String(m.fund_started) !== filterFundStart) return false;
      if (filterPopType !== "all" && m.pop_type !== filterPopType) return false;
      if (filterStatus !== "all" && m.status !== filterStatus) return false;
      return true;
    });
  }, [managers, search, filterFundStart, filterPopType, filterStatus]);

  const stats = useMemo(() => {
    const total = managers?.length ?? 0;
    let totalClients = 0;
    let totalOnline = 0;
    for (const m of managers ?? []) {
      const bid = (m as any).branch_id;
      if (!bid) continue;
      const c = clientCounts?.[bid];
      if (c) { totalClients += c.running; totalOnline += c.online; }
    }
    return { total, totalClients, totalOnline };
  }, [managers, clientCounts]);

  const handleLoginAs = (m: any) => {
    toast.info(`POP "${m.name}" হিসেবে লগইন — Phase 2-এ আসছে`);
  };
  const handleTypeChange = (m: any) => {
    const next = m.pop_type === "prepaid" ? "postpaid" : "prepaid";
    update.mutate({ id: m.id, patch: { pop_type: next } });
    toast.success(`POP type → ${next}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">POP ম্যানেজার লিস্ট</h1>
          <p className="text-sm text-muted-foreground">সকল POP, ফান্ড স্ট্যাটাস, ক্লায়েন্ট সংখ্যা ও অ্যাকশন</p>
        </div>
        <Button onClick={() => navigate("/dashboard/branches/add-manager")}>
          <Plus className="h-4 w-4" /> POP যোগ করুন
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<Users className="h-5 w-5" />} label="মোট POP" value={stats.total} color="bg-primary/10 text-primary" />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="মোট POP ক্লায়েন্ট" value={stats.totalClients} color="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={<Wifi className="h-5 w-5" />} label="অনলাইন ক্লায়েন্ট" value={stats.totalOnline} color="bg-blue-500/10 text-blue-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="নাম / কোড / ইউজার..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterFundStart} onValueChange={setFilterFundStart}>
            <SelectTrigger><SelectValue placeholder="Fund Start" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fund Status</SelectItem>
              <SelectItem value="true">Fund Started</SelectItem>
              <SelectItem value="false">Fund Off</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPopType} onValueChange={setFilterPopType}>
            <SelectTrigger><SelectValue placeholder="POP Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="prepaid">Prepaid</SelectItem>
              <SelectItem value="postpaid">Postpaid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>POP Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Tariff</TableHead>
                  <TableHead className="text-center">Running</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead className="text-center">Disabled</TableHead>
                  <TableHead className="text-center">Left</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Client Enabled</TableHead>
                  <TableHead className="text-center">Fund Start</TableHead>
                  <TableHead className="text-center">Locked</TableHead>
                  <TableHead className="w-12">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={16} className="text-center text-muted-foreground py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={16} className="text-center text-muted-foreground py-8">কোনো POP পাওয়া যায়নি</TableCell></TableRow>
                ) : (
                  filtered.map((m: any, i) => {
                    const c = (m.branch_id ? clientCounts?.[m.branch_id] : null) || { running: 0, enabled: 0, disabled: 0, left: 0 };
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/30">
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{m.pop_code || "-"}</TableCell>
                        <TableCell className="font-medium">
                          <button className="hover:underline text-left" onClick={() => navigate(`/dashboard/branches/pop/${m.id}`)}>
                            {m.company_name || m.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.pop_type === "prepaid" ? "default" : "secondary"}>{m.pop_type}</Badge>
                        </TableCell>
                        <TableCell>{m.name}</TableCell>
                        <TableCell>{m.contact || "-"}</TableCell>
                        <TableCell className="text-xs">{m.reseller_tariffs?.name || "-"}</TableCell>
                        <TableCell className="text-center">{c.running}</TableCell>
                        <TableCell className="text-center text-emerald-600">{c.enabled}</TableCell>
                        <TableCell className="text-center text-destructive">{c.disabled}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{c.left}</TableCell>
                        <TableCell className="text-right font-mono">৳{Number(m.balance ?? 0).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={m.client_create_permission}
                            onCheckedChange={(v) => update.mutate({ id: m.id, patch: { client_create_permission: v } })}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={m.fund_started}
                            onCheckedChange={(v) =>
                              update.mutate({ id: m.id, patch: { fund_started: v, fund_started_at: v ? new Date().toISOString() : null } })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={m.is_locked}
                            onCheckedChange={(v) => update.mutate({ id: m.id, patch: { is_locked: v } })}
                          />
                        </TableCell>
                        <TableCell>
                          <PopActionMenu
                            onView={() => navigate(`/dashboard/branches/pop/${m.id}`)}
                            onEdit={() => navigate(`/dashboard/branches/edit-manager/${m.id}`)}
                            onLogin={() => handleLoginAs(m)}
                            onPasswordRegen={() => setPwdPop(m)}
                            onFund={() => setFundPop(m)}
                            onTypeChange={() => handleTypeChange(m)}
                            onSendMessage={() => toast.info("Coming soon")}
                            onDelete={() => {
                              if (confirm(`"${m.name}" POP মুছবেন?`)) del.mutate(m.id);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <FundDeductionDialog open={!!fundPop} onOpenChange={(v) => !v && setFundPop(null)} pop={fundPop} />
      <PasswordRegenerateDialog open={!!pwdPop} onOpenChange={(v) => !v && setPwdPop(null)} pop={pwdPop} />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 flex items-center gap-3">
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
