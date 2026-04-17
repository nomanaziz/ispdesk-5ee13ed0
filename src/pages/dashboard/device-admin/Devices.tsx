import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Server, Cpu, Network, Users, Database } from "lucide-react";

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  mikrotik: { label: "MikroTik", icon: Server, color: "bg-blue-500/10 text-blue-600" },
  olt: { label: "OLT", icon: Cpu, color: "bg-purple-500/10 text-purple-600" },
  switch: { label: "Switch / POP", icon: Network, color: "bg-emerald-500/10 text-emerald-600" },
  zkteco: { label: "ZKTeco", icon: Users, color: "bg-amber-500/10 text-amber-600" },
};

export default function DeviceInventory() {
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["device_admin_inventory"],
    queryFn: async () => {
      const [mk, olt, sw, zk] = await Promise.all([
        supabase.from("mikrotik_devices").select("id,name,ip_address,status"),
        supabase.from("olt_devices").select("id,name,ip_address,status"),
        supabase.from("pop_devices").select("id,name,ip_address,status"),
        supabase.from("zkteco_devices").select("id,name,ip_address,status,location"),
      ]);
      return [
        ...(mk.data ?? []).map((d: any) => ({ ...d, type: "mikrotik" })),
        ...(olt.data ?? []).map((d: any) => ({ ...d, type: "olt" })),
        ...(sw.data ?? []).map((d: any) => ({ ...d, type: "switch" })),
        ...(zk.data ?? []).map((d: any) => ({ ...d, type: "zkteco" })),
      ];
    },
  });

  const filtered = data.filter((d: any) => {
    if (type !== "all" && d.type !== type) return false;
    if (search && !`${d.name} ${d.ip_address || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" /> ডিভাইস ইনভেন্টরি
      </h1>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল টাইপ</SelectItem>
                <SelectItem value="mikrotik">MikroTik</SelectItem>
                <SelectItem value="olt">OLT</SelectItem>
                <SelectItem value="switch">Switch / POP</SelectItem>
                <SelectItem value="zkteco">ZKTeco</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="নাম বা IP দিয়ে সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="ml-auto text-sm text-muted-foreground">মোট: {filtered.length}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>টাইপ</TableHead>
                <TableHead>নাম</TableHead>
                <TableHead>IP অ্যাড্রেস</TableHead>
                <TableHead>লোকেশন</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো ডিভাইস পাওয়া যায়নি</TableCell></TableRow>
              ) : filtered.map((d: any, i: number) => {
                const meta = TYPE_META[d.type];
                const Icon = meta.icon;
                return (
                  <TableRow key={`${d.type}-${d.id}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${meta.color}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-sm">{d.ip_address || "—"}</TableCell>
                    <TableCell>{d.location || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === "online" ? "default" : d.status === "offline" ? "destructive" : "secondary"}>
                        {d.status || "unknown"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
