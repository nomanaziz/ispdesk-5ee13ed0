import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Eye, EyeOff, ExternalLink, CheckSquare, XCircle, Filter, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

export default function Import() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedServer, setSelectedServer] = useState<string>("all");
  const [protocolFilter, setProtocolFilter] = useState<string>("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: servers = [] } = useQuery({
    queryKey: ["mikrotik_devices_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mikrotik_devices").select("id, name").neq("status", "offline").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingUsernames = [] } = useQuery({
    queryKey: ["existing_client_usernames"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("username");
      return (data || []).map((c: any) => c.username?.toLowerCase()).filter(Boolean);
    },
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["mikrotik_clients", selectedServer, protocolFilter, profileFilter, userTypeFilter],
    queryFn: async () => {
      let q = supabase.from("mikrotik_clients").select("*, mikrotik_devices(name), branches(name)").eq("exported", false).order("created_at", { ascending: false });
      if (selectedServer !== "all") q = q.eq("mikrotik_id", selectedServer);
      if (protocolFilter !== "all") q = q.eq("service", protocolFilter);
      if (profileFilter !== "all") q = q.eq("profile", profileFilter);
      if (userTypeFilter !== "all") q = q.eq("user_status", userTypeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const profiles = [...new Set(clients.map((c: any) => c.profile).filter(Boolean))];

  const syncFromMikroTik = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-mikrotik-ppp", {
        body: { device_id: selectedServer !== "all" ? selectedServer : "all" },
      });
      if (error) throw error;
      if (data?.errors?.length) {
        toast.warning(`${data.synced} জন সিঙ্ক হয়েছে, ${data.errors.length} টি ত্রুটি`);
      } else {
        toast.success(`${data?.synced || 0} জন PPP ইউজার সিঙ্ক হয়েছে`);
      }
      queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] });
    } catch (e: any) {
      toast.error("সিঙ্ক ব্যর্থ: " + (e.message || "অজানা ত্রুটি"));
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToClientList = (client: any) => {
    navigate("/dashboard/clients/add", {
      state: {
        prefill: {
          username: client.name,
          password: client.password,
          server_name: client.server_name,
          mac_address: client.caller_id,
          profile: client.profile,
          mikrotik_id: client.mikrotik_id,
        },
      },
    });
  };

  const exportToMacReseller = useMutation({
    mutationFn: async () => {
      if (selectedIds.size === 0) {
        toast.error("ক্লায়েন্ট সিলেক্ট করুন");
        return;
      }
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("mikrotik_clients").update({ exported: true, exported_to: "mac_reseller" }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mikrotik_clients"] });
      setSelectedIds(new Set());
      toast.success("MAC রিসেলারে এক্সপোর্ট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      clients.map((c: any) => ({
        "নাম": c.name,
        "পাসওয়ার্ড": c.password,
        "সার্ভিস": c.service,
        "প্রোফাইল": c.profile,
        "Caller ID": c.caller_id,
        "সার্ভার": c.mikrotik_devices?.name || "",
        "রিমোট অ্যাড্রেস": c.remote_address,
        "স্ট্যাটাস": c.user_status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MikroTik Clients");
    XLSX.writeFile(wb, "mikrotik_clients.xlsx");
    toast.success("Excel ডাউনলোড হয়েছে");
  };

  const clearFilters = () => {
    setSelectedServer("all");
    setProtocolFilter("all");
    setProfileFilter("all");
    setUserTypeFilter("all");
    setSearch("");
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c: any) => c.id)));
    }
  };

  const filtered = clients
    .filter((c: any) => !existingUsernames.includes(c.name?.toLowerCase()))
    .filter((c: any) =>
      [c.name, c.caller_id, c.server_name].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
    );

  const statusColor: Record<string, string> = {
    unique: "bg-green-100 text-green-800",
    duplicate: "bg-yellow-100 text-yellow-800",
    disabled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Upload className="h-6 w-6" /> ইমপোর্ট ফ্রম মাইক্রোটিক</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedServer} onValueChange={setSelectedServer}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="সার্ভার" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল সার্ভার</SelectItem>
                {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={protocolFilter} onValueChange={setProtocolFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="প্রোটোকল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল</SelectItem>
                <SelectItem value="pppoe">PPPoE</SelectItem>
                <SelectItem value="dhcp">DHCP</SelectItem>
                <SelectItem value="hotspot">Hotspot</SelectItem>
              </SelectContent>
            </Select>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="প্রোফাইল" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল প্রোফাইল</SelectItem>
                {profiles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="ইউজার টাইপ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল</SelectItem>
                <SelectItem value="unique">Unique</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters}><XCircle className="h-4 w-4 mr-1" /> ক্লিয়ার</Button>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={generateExcel}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel জেনারেট</Button>
            <Button variant="default" size="sm" onClick={() => exportToMacReseller.mutate()} disabled={selectedIds.size === 0}>
              <ExternalLink className="h-4 w-4 mr-1" /> MAC রিসেলারে এক্সপোর্ট ({selectedIds.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>পাসওয়ার্ড</TableHead>
                  <TableHead>সার্ভিস</TableHead>
                  <TableHead>প্রোফাইল</TableHead>
                  <TableHead>Caller ID</TableHead>
                  <TableHead>সার্ভার</TableHead>
                  <TableHead>Logout Time</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>ব্রাঞ্চ</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8">কোনো ক্লায়েন্ট পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          checked ? next.add(c.id) : next.delete(c.id);
                          setSelectedIds(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{showPasswords[c.id] ? c.password : "••••"}</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowPasswords((p) => ({ ...p, [c.id]: !p[c.id] }))}>
                          {showPasswords[c.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{c.service}</TableCell>
                    <TableCell>{c.profile}</TableCell>
                    <TableCell className="font-mono text-xs">{c.caller_id}</TableCell>
                    <TableCell>{c.mikrotik_devices?.name || "—"}</TableCell>
                    <TableCell className="text-xs">{c.logout_time ? new Date(c.logout_time).toLocaleString("bn-BD") : "—"}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded ${statusColor[c.user_status] || "bg-muted"}`}>{c.user_status}</span></TableCell>
                    <TableCell>{c.branches?.name || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="ক্লায়েন্ট লিস্টে এক্সপোর্ট" onClick={() => exportToClientList(c)}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-3 text-sm text-muted-foreground">মোট: {filtered.length} জন ক্লায়েন্ট</div>
        </CardContent>
      </Card>
    </div>
  );
}
