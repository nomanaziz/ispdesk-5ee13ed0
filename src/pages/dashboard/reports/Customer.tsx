import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";
import { fmtMoney } from "@/lib/reportExport";

export default function Customer() {
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [f, setF] = useState({
    custom_status: "all", protocol: "all", client_type: "all", b_status: "all",
    from: "", to: "",
  });
  const [a, setA] = useState(f);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rpt-customer", a],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("id, client_id, user_id, name, contact, client_type, status, monthly_bill, billing_status, mikrotik_status, protocol_type, profile, server_name, password, package_id, created_at, pkg:package_id(name)")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (a.client_type !== "all") q = q.eq("client_type", a.client_type);
      if (a.b_status !== "all") q = q.eq("billing_status", a.b_status);
      if (a.protocol !== "all") q = q.eq("protocol_type", a.protocol);
      if (a.from) q = q.gte("created_at", a.from);
      if (a.to) q = q.lte("created_at", a.to + "T23:59:59");
      const { data } = await q;
      let list = (data || []).map((c: any) => ({
        id: c.id,
        client_code: c.client_id || "",
        username: c.user_id || "",
        password: c.password || "",
        name: c.name || "",
        contact: c.contact || "",
        client_type: c.client_type || "",
        package: c.pkg?.name || "",
        server: c.server_name || "",
        protocol: c.protocol_type || "",
        profile: c.profile || "",
        monthly_bill: Number(c.monthly_bill) || 0,
        b_status: c.billing_status || "",
        m_status: c.mikrotik_status || "",
        custom_status: c.status || "",
      }));
      if (a.custom_status !== "all") list = list.filter((r) => r.custom_status === a.custom_status);
      return list;
    },
  });

  const totals = useMemo(() => ({ monthly_bill: rows.reduce((s, r) => s + r.monthly_bill, 0) }), [rows]);

  return (
    <ReportLayout
      title="Customer Report"
      breadcrumb="Report > Customer"
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">Custom Status</Label>
            <Select value={f.custom_status} onValueChange={(v) => setF({ ...f, custom_status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="left">Left</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Protocol</Label>
            <Select value={f.protocol} onValueChange={(v) => setF({ ...f, protocol: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="pppoe">PPPoE</SelectItem><SelectItem value="static">Static</SelectItem><SelectItem value="dhcp">DHCP</SelectItem><SelectItem value="hotspot">Hotspot</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Client Type</Label>
            <Select value={f.client_type} onValueChange={(v) => setF({ ...f, client_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home">Home</SelectItem><SelectItem value="corporate">Corporate</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">B.Status</Label>
            <Select value={f.b_status} onValueChange={(v) => setF({ ...f, b_status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="due">Due</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From Date</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">To Date</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply</Button>
        </div>
      }
      columns={[
        { key: "client_code", label: "Client Code" },
        { key: "username", label: "Username" },
        {
          key: "password", label: "Password", sortable: false,
          format: (v: string, r: any) => (
            <span className="inline-flex items-center gap-1">
              <span className="font-mono">{show[r.id] ? v : "••••••"}</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); setShow((p) => ({ ...p, [r.id]: !p[r.id] })); }}>
                {show[r.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </span>
          ) as any,
        },
        { key: "name", label: "Customer Name" },
        { key: "contact", label: "Contact" },
        { key: "client_type", label: "Client Type" },
        { key: "package", label: "Package" },
        { key: "server", label: "Server" },
        { key: "protocol", label: "Protocol" },
        { key: "profile", label: "Profile" },
        { key: "monthly_bill", label: "Monthly Bill", align: "right", format: fmtMoney },
        { key: "b_status", label: "B.Status", format: (v) => <Badge variant="outline">{v}</Badge> as any },
        { key: "m_status", label: "M.Status", format: (v) => <Badge variant={v === "enabled" ? "default" : "secondary"}>{v || "-"}</Badge> as any },
      ]}
      rows={rows}
      loading={isLoading}
      totalsRow={{ client_code: "Total", monthly_bill: fmtMoney(totals.monthly_bill) }}
      rowKey={(r) => r.id}
    />
  );
}
