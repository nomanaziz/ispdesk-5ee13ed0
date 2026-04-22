import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/reportExport";
import { usePopScope } from "@/hooks/usePopScope";

const prevMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { from: fmt(start), to: fmt(end) };
};

export default function PopBtrc() {
  const { branchId } = usePopScope();
  const init = prevMonthRange();
  const [f, setF] = useState({
    user_type: "all", client_type: "all", connection_type: "all",
    b_status: "all", zone_id: "all", allocated_ip_type: "user_id",
    distributed_point_type: "all",
    from: init.from, to: init.to,
  });
  const [a, setA] = useState(f);

  const { data: zones } = useQuery({
    queryKey: ["pop-btrc-zones", branchId],
    enabled: !!branchId,
    queryFn: async () => (await supabase.from("zones").select("id,name").eq("status", "active").eq("branch_id", branchId!)).data || [],
  });

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["pop-rpt-btrc", branchId, a],
    enabled: !!branchId,
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select(`
          id, client_id, user_id, name, contact, email, address, monthly_bill,
          client_type, connection_type, billing_status, joining_date, status,
          zone_id, sub_zone_id, box_id, package_id,
          remote_address, mac_address,
          pkg:package_id(name, olt_range),
          zone:zone_id(name)
        `)
        .eq("branch_id", branchId!)
        .eq("status", "active")
        .gte("joining_date", a.from)
        .lte("joining_date", a.to)
        .limit(5000);
      if (a.client_type !== "all") q = q.eq("client_type", a.client_type);
      if (a.connection_type !== "all") q = q.eq("connection_type", a.connection_type);
      if (a.b_status !== "all") q = q.eq("billing_status", a.b_status);
      if (a.zone_id !== "all") q = q.eq("zone_id", a.zone_id);
      const { data } = await q;
      return (data || []).map((c: any, i: number) => ({
        id: c.id,
        sn: i + 1,
        client_type: c.client_type || "Home",
        connection_type: c.connection_type || "Broadband",
        client_name: c.name || "",
        bandwidth_distribution_point: c.zone?.name || "POP",
        connectivity_type: c.client_type === "corporate" ? "Dedicated" : "Shared",
        activation_date: c.joining_date,
        bandwidth_allocation: c.pkg?.olt_range || c.pkg?.name || "",
        allocated_ip: a.allocated_ip_type === "real_ip" ? (c.remote_address || "-") : (c.user_id || c.client_id || "-"),
        division: "-",
        district: "-",
        thana: "-",
        address: c.address || "",
        client_mobile: c.contact || "",
        client_email: c.email || "",
        selling_price: Number(c.monthly_bill) || 0,
      }));
    },
  });

  const handleSync = async () => {
    toast.loading("Syncing clients & servers...");
    await refetch();
    toast.dismiss();
    toast.success("Sync complete");
  };

  return (
    <ReportLayout
      title="BTRC Monthly Report"
      breadcrumb="Report > BTRC Monthly Report"
      enableExcel
      extraActions={<Button onClick={handleSync} size="sm" variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Sync Clients & Servers</Button>}
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">User Type</Label>
            <Select value={f.user_type} onValueChange={(v) => setF({ ...f, user_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="reseller">Reseller</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Client Type</Label>
            <Select value={f.client_type} onValueChange={(v) => setF({ ...f, client_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home">Home</SelectItem><SelectItem value="corporate">Corporate</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Connection Type</Label>
            <Select value={f.connection_type} onValueChange={(v) => setF({ ...f, connection_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="fiber">Fiber</SelectItem><SelectItem value="broadband">Broadband</SelectItem><SelectItem value="wireless">Wireless</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">B.Status</Label>
            <Select value={f.b_status} onValueChange={(v) => setF({ ...f, b_status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Zone</Label>
            <Select value={f.zone_id} onValueChange={(v) => setF({ ...f, zone_id: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem>{(zones || []).map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Allocated IP Type</Label>
            <Select value={f.allocated_ip_type} onValueChange={(v) => setF({ ...f, allocated_ip_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="user_id">User ID</SelectItem><SelectItem value="real_ip">Real IP</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Activation From</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">Activation To</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply</Button>
        </div>
      }
      columns={[
        { key: "sn", label: "SN" },
        { key: "client_type", label: "Client Type" },
        { key: "connection_type", label: "Connection Type" },
        { key: "client_name", label: "Client Name" },
        { key: "bandwidth_distribution_point", label: "BW Distribution Point" },
        { key: "connectivity_type", label: "Connectivity Type" },
        { key: "activation_date", label: "Activation Date", format: fmtDate },
        { key: "bandwidth_allocation", label: "BW Allocation" },
        { key: "allocated_ip", label: "Allocated IP" },
        { key: "division", label: "Division" },
        { key: "district", label: "District" },
        { key: "thana", label: "Thana" },
        { key: "address", label: "Address" },
        { key: "client_mobile", label: "Mobile" },
        { key: "client_email", label: "Email" },
        { key: "selling_price", label: "Selling Price (BDT)", align: "right", format: fmtMoney },
      ]}
      rows={rows}
      loading={isLoading}
      rowKey={(r) => r.id}
    />
  );
}
