import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Eye, KeyRound, History, Users, Smartphone, UserX } from "lucide-react";
import { toast } from "sonner";
import LoginHistoryDialog from "./LoginHistoryDialog";
import CredentialDialog from "./CredentialDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ONLINE_WINDOW_MS = 30 * 60 * 1000;

export default function RegisteredClientsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "app" | "non-app">("all");
  const [historyClient, setHistoryClient] = useState<{ id: string; name: string } | null>(null);
  const [credClient, setCredClient] = useState<{ name: string; username: string; password: string } | null>(null);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["pm-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, client_id, name, username, password, contact, status")
        .eq("owner_scope", "admin")
        .order("client_id")
        .limit(2000);
      return data || [];
    },
  });

  const { data: lastLogins } = useQuery({
    queryKey: ["pm-last-logins"],
    queryFn: async () => {
      const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("portal_login_log")
        .select("client_id, login_at, logout_at, status")
        .gte("login_at", since)
        .order("login_at", { ascending: false });
      const map = new Map<string, { login_at: string; status: string; logout_at: string | null }>();
      (data || []).forEach((r: any) => {
        if (r.client_id && !map.has(r.client_id)) {
          map.set(r.client_id, { login_at: r.login_at, status: r.status, logout_at: r.logout_at });
        }
      });
      return map;
    },
  });

  const enriched = useMemo(() => {
    if (!clients) return [];
    return clients.map((c: any) => {
      const last = lastLogins?.get(c.id);
      const isOnline = last && last.status === "active" && !last.logout_at && Date.now() - new Date(last.login_at).getTime() < ONLINE_WINDOW_MS;
      const isAppUser = !!last && Date.now() - new Date(last.login_at).getTime() < 30 * 24 * 60 * 60 * 1000;
      return { ...c, last_login: last?.login_at, isOnline, isAppUser };
    });
  }, [clients, lastLogins]);

  const filtered = useMemo(() => {
    return enriched.filter((c) => {
      if (filter === "app" && !c.isAppUser) return false;
      if (filter === "non-app" && c.isAppUser) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return c.client_id?.toLowerCase().includes(s) || c.name?.toLowerCase().includes(s) || c.contact?.toLowerCase().includes(s) || c.username?.toLowerCase().includes(s);
    });
  }, [enriched, search, filter]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const app = enriched.filter((c) => c.isAppUser).length;
    return { total, app, nonApp: total - app, online: enriched.filter((c) => c.isOnline).length };
  }, [enriched]);

  const resetPwd = useMutation({
    mutationFn: async (c: any) => {
      const { data: setting } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "portal_default_password_source").maybeSingle();
      const src = (setting?.setting_value as string) || "mobile";
      let newPwd = c.contact || c.client_id;
      if (src === "pppoe") newPwd = c.client_id;
      const { error } = await supabase.from("clients").update({ password: newPwd, username: c.client_id }).eq("id", c.id);
      if (error) throw error;
      return newPwd;
    },
    onSuccess: (pwd, c) => {
      toast.success("Password reset");
      setCredClient({ name: c.name, username: c.client_id, password: pwd });
      qc.invalidateQueries({ queryKey: ["pm-clients"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Clients" value={stats.total} color="from-blue-500 to-cyan-500" />
        <StatCard icon={<Smartphone className="h-4 w-4" />} label="App Users (30d)" value={stats.app} color="from-emerald-500 to-teal-500" />
        <StatCard icon={<UserX className="h-4 w-4" />} label="Non-App Users" value={stats.nonApp} color="from-amber-500 to-orange-500" />
        <StatCard icon={<Eye className="h-4 w-4" />} label="Online Now" value={stats.online} color="from-violet-500 to-purple-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by client code, name, mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="app">App Users Only</SelectItem>
            <SelectItem value="non-app">Non-App Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="text-xs">#</TableHead>
              <TableHead className="text-xs">Client Code</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs">Mobile</TableHead>
              <TableHead className="text-xs">Username</TableHead>
              <TableHead className="text-xs">Last Login</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center text-xs py-6 text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-xs py-6 text-muted-foreground">No clients</TableCell></TableRow>}
            {filtered.slice(0, 200).map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">{i + 1}</TableCell>
                <TableCell className="text-xs font-mono font-medium">{c.client_id}</TableCell>
                <TableCell className="text-xs">{c.name}</TableCell>
                <TableCell className="text-xs">{c.contact || "-"}</TableCell>
                <TableCell className="text-xs font-mono">{c.username || c.client_id}</TableCell>
                <TableCell className="text-xs">{c.last_login ? new Date(c.last_login).toLocaleString() : <span className="text-muted-foreground">Never</span>}</TableCell>
                <TableCell className="text-xs">
                  {c.isOnline ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 border-0 gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                    </Badge>
                  ) : c.isAppUser ? (
                    <Badge variant="secondary" className="text-[10px]">Offline</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Never logged in</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCredClient({ name: c.name, username: c.username || c.client_id, password: c.password || "" })}><Eye className="h-3.5 w-3.5 mr-2" /> Show Credentials</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHistoryClient({ id: c.id, name: c.name })}><History className="h-3.5 w-3.5 mr-2" /> Login History</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => resetPwd.mutate(c)}><KeyRound className="h-3.5 w-3.5 mr-2" /> Reset to Default</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 200 && <div className="text-center text-xs text-muted-foreground py-2">Showing first 200 of {filtered.length}. Refine search to see more.</div>}
      </div>

      <LoginHistoryDialog open={!!historyClient} onClose={() => setHistoryClient(null)} clientId={historyClient?.id} clientName={historyClient?.name} />
      <CredentialDialog open={!!credClient} onClose={() => setCredClient(null)} username={credClient?.username} password={credClient?.password} name={credClient?.name} />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground truncate">{label}</div>
          <div className="text-lg font-bold leading-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
