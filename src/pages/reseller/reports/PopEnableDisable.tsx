import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/reportExport";
import { usePopScope } from "@/hooks/usePopScope";

export default function PopEnableDisable() {
  const { branchId } = usePopScope();
  const [f, setF] = useState({ action: "all", from: "", to: "" });
  const [a, setA] = useState(f);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-rpt-enable-disable", branchId, a],
    enabled: !!branchId,
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("id, client_id, user_id, name, status, mikrotik_status, updated_at, created_at")
        .eq("branch_id", branchId!)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (a.from) q = q.gte("updated_at", a.from);
      if (a.to) q = q.lte("updated_at", a.to + "T23:59:59");
      const { data } = await q;
      let list = (data || []).map((c: any, i: number) => {
        const enabled = c.mikrotik_status === "enabled" || c.status === "active";
        return {
          id: c.id,
          sn: i + 1,
          client_code: c.client_id || "",
          username: c.user_id || "",
          name: c.name || "",
          action: enabled ? "Enabled" : "Disabled",
          reason: enabled ? "-" : (c.status === "left" ? "Left" : "Auto / Manual"),
          date: c.updated_at || c.created_at,
          by: "-",
        };
      });
      if (a.action !== "all") list = list.filter((r) => r.action.toLowerCase() === a.action);
      return list;
    },
  });

  const counts = useMemo(() => ({
    enabled: rows.filter((r) => r.action === "Enabled").length,
    disabled: rows.filter((r) => r.action === "Disabled").length,
    total: rows.length,
  }), [rows]);

  return (
    <ReportLayout
      title="Enable/Disable Report"
      breadcrumb="Report > Enable/Disable"
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">Action</Label>
            <Select value={f.action} onValueChange={(v) => setF({ ...f, action: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="enabled">Enabled</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply</Button>
          <div className="md:col-span-4 flex gap-3 text-xs text-muted-foreground">
            <span>Total: <b className="text-foreground">{counts.total}</b></span>
            <span>Enabled: <b className="text-green-600">{counts.enabled}</b></span>
            <span>Disabled: <b className="text-destructive">{counts.disabled}</b></span>
          </div>
        </div>
      }
      columns={[
        { key: "sn", label: "SN" },
        { key: "client_code", label: "Client Code" },
        { key: "username", label: "Username" },
        { key: "name", label: "Name" },
        {
          key: "action", label: "Action",
          format: (v: string) => <Badge variant={v === "Enabled" ? "default" : "destructive"}>{v}</Badge> as any,
        },
        { key: "reason", label: "Reason" },
        { key: "date", label: "Date", format: fmtDateTime },
        { key: "by", label: "By" },
      ]}
      rows={rows}
      loading={isLoading}
      rowKey={(r) => r.id}
    />
  );
}
