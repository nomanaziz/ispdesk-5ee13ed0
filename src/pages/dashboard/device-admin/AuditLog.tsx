import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, Download, UserPlus, UserX, HardDrive, Settings as SettingsIcon } from "lucide-react";
import { exportCSV } from "@/lib/reportExport";

const ICON: Record<string, any> = {
  user_added: UserPlus,
  user_deleted: UserX,
  backup_taken: HardDrive,
  permission_changed: SettingsIcon,
  restored: HardDrive,
};

export default function AuditLog() {
  const [type, setType] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["device_admin_audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("device_admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const filtered = logs.filter((l: any) => {
    if (type !== "all" && l.device_type !== type) return false;
    if (action !== "all" && l.action !== action) return false;
    if (search && !`${l.device_name} ${l.target_username} ${l.performed_by_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    exportCSV("device_admin_audit_log", [
      { key: "created_at", label: "Time", format: (v) => new Date(v).toLocaleString() },
      { key: "action", label: "Action" },
      { key: "device_type", label: "Device Type" },
      { key: "device_name", label: "Device" },
      { key: "target_username", label: "Username" },
      { key: "performed_by_name", label: "Performed By" },
      { key: "status", label: "Status" },
    ], filtered);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" /> অডিট লগ
        </h1>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> CSV এক্সপোর্ট</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল টাইপ</SelectItem>
                <SelectItem value="mikrotik">MikroTik</SelectItem>
                <SelectItem value="olt">OLT</SelectItem>
                <SelectItem value="switch">Switch</SelectItem>
                <SelectItem value="zkteco">ZKTeco</SelectItem>
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল অ্যাকশন</SelectItem>
                <SelectItem value="user_added">User Added</SelectItem>
                <SelectItem value="user_deleted">User Deleted</SelectItem>
                <SelectItem value="backup_taken">Backup</SelectItem>
                <SelectItem value="permission_changed">Permission</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="সার্চ..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <div className="ml-auto text-sm text-muted-foreground">{filtered.length} রেকর্ড</div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">লোড হচ্ছে...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">কোনো রেকর্ড নেই</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((l: any) => {
                const Icon = ICON[l.action] || ScrollText;
                return (
                  <div key={l.id} className="flex items-start gap-3 p-3 rounded border border-border hover:bg-muted/30">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{l.action}</Badge>
                        {l.device_type && <Badge variant="secondary" className="text-xs">{l.device_type}</Badge>}
                        <span className="font-medium text-sm">{l.device_name || "—"}</span>
                        {l.target_username && <span className="text-sm text-muted-foreground">→ {l.target_username}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {l.performed_by_name || "system"} • {new Date(l.created_at).toLocaleString("bn-BD")}
                        {l.ip_address && <span> • {l.ip_address}</span>}
                      </div>
                    </div>
                    <Badge variant={l.status === "success" ? "default" : "destructive"} className="text-xs">{l.status}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
