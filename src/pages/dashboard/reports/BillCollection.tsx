import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMoney } from "@/lib/reportExport";

export default function BillCollection() {
  const [filters, setFilters] = useState({
    username: "", payment_method: "all", package_id: "all", billing_status: "all",
    zone_id: "all", sub_zone_id: "all", box_id: "all", affiliator_id: "all",
    creation_from: "", creation_to: "", receive_from: "", receive_to: "",
  });
  const [applied, setApplied] = useState(filters);

  const { data: zones } = useQuery({ queryKey: ["rpt-zones"], queryFn: async () => (await supabase.from("zones").select("id,name").eq("status", "active")).data || [] });
  const { data: subZones } = useQuery({ queryKey: ["rpt-subzones"], queryFn: async () => (await supabase.from("sub_zones").select("id,name").eq("status", "active")).data || [] });
  const { data: boxes } = useQuery({ queryKey: ["rpt-boxes"], queryFn: async () => (await supabase.from("boxes").select("id,name").eq("status", "active")).data || [] });
  const { data: packages } = useQuery({ queryKey: ["rpt-packages"], queryFn: async () => (await supabase.from("packages").select("id,name").eq("is_active", true)).data || [] });
  const { data: affiliates } = useQuery({ queryKey: ["rpt-affiliates"], queryFn: async () => (await supabase.from("affiliates").select("id,name").eq("status", "active")).data || [] });
  const { data: pmethods } = useQuery({ queryKey: ["rpt-pmethods"], queryFn: async () => (await supabase.from("payment_methods").select("id,name")).data || [] });
  const { data: bstatuses } = useQuery({ queryKey: ["rpt-bstatus"], queryFn: async () => (await supabase.from("billing_statuses").select("id,name")).data || [] });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rpt-bill-coll", applied],
    queryFn: async () => {
      let q = supabase
        .from("bill_collections")
        .select("id, amount, discount, vat, payment_method, transaction_id, note, status, created_at, billing_id, billing:billing_id(bill_id, month, amount, due_date), client:client_id(id, client_id, user_id, name, contact, zone_id, sub_zone_id, box_id, package_id, billing_status, affiliator_id, zone:zone_id(name), sub_zone:sub_zone_id(name), box:box_id(name), pkg:package_id(name), affiliator:affiliator_id(name))")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (applied.payment_method !== "all") q = q.eq("payment_method", applied.payment_method);
      if (applied.creation_from) q = q.gte("created_at", applied.creation_from);
      if (applied.creation_to) q = q.lte("created_at", applied.creation_to + "T23:59:59");
      const { data } = await q;
      let list = (data || []).map((c: any) => ({
        id: c.id,
        receive_date: c.created_at,
        client_code: c.client?.client_id || "",
        user_id: c.client?.user_id || "",
        name: c.client?.name || "",
        mobile: c.client?.contact || "",
        zone: c.client?.zone?.name || "",
        sub_zone: c.client?.sub_zone?.name || "",
        box: c.client?.box?.name || "",
        package: c.client?.pkg?.name || "",
        b_status: c.client?.billing_status || "",
        affiliator: c.client?.affiliator?.name || "",
        trx_id: c.transaction_id || "",
        bill_month: c.billing?.month || "",
        monthly_bill: Number(c.billing?.amount) || 0,
        received: Number(c.amount) || 0,
        discount: Number(c.discount) || 0,
        receipt_no: c.billing?.bill_id || "",
        payment_method: c.payment_method || "",
        note: c.note || "",
        client_pkg_id: c.client?.package_id,
        client_zone_id: c.client?.zone_id,
        client_sub_zone_id: c.client?.sub_zone_id,
        client_box_id: c.client?.box_id,
        client_aff_id: c.client?.affiliator_id,
        client_b_status: c.client?.billing_status,
      }));
      if (applied.username) list = list.filter((r) => `${r.client_code} ${r.user_id} ${r.name}`.toLowerCase().includes(applied.username.toLowerCase()));
      if (applied.package_id !== "all") list = list.filter((r) => r.client_pkg_id === applied.package_id);
      if (applied.zone_id !== "all") list = list.filter((r) => r.client_zone_id === applied.zone_id);
      if (applied.sub_zone_id !== "all") list = list.filter((r) => r.client_sub_zone_id === applied.sub_zone_id);
      if (applied.box_id !== "all") list = list.filter((r) => r.client_box_id === applied.box_id);
      if (applied.affiliator_id !== "all") list = list.filter((r) => r.client_aff_id === applied.affiliator_id);
      if (applied.billing_status !== "all") list = list.filter((r) => r.client_b_status === applied.billing_status);
      if (applied.receive_from) list = list.filter((r) => r.receive_date >= applied.receive_from);
      if (applied.receive_to) list = list.filter((r) => r.receive_date <= applied.receive_to + "T23:59:59");
      return list;
    },
  });

  const totals = useMemo(() => ({
    monthly_bill: rows.reduce((s, r) => s + r.monthly_bill, 0),
    received: rows.reduce((s, r) => s + r.received, 0),
    discount: rows.reduce((s, r) => s + r.discount, 0),
  }), [rows]);

  const upd = (k: string, v: string) => setFilters((p) => ({ ...p, [k]: v }));

  return (
    <ReportLayout
      title="Bill Collection Report"
      breadcrumb="Report > Bill Collection"
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Username/Code/Name</Label><Input value={filters.username} onChange={(e) => upd("username", e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">Payment Method</Label>
            <SearchableSelect value={filters.payment_method} onValueChange={(v) => upd("payment_method", v)} options={[{value:"all",label:"All"}, ...((pmethods||[]).map((p:any)=>({value:p.name,label:p.name})))]} className="h-9" />
          </div>
          <div>
            <Label className="text-xs mb-1">Package</Label>
            <SearchableSelect value={filters.package_id} onValueChange={(v) => upd("package_id", v)} options={[{value:"all",label:"All"}, ...((packages||[]).map((p:any)=>({value:p.id,label:p.name})))]} className="h-9" />
          </div>
          <div>
            <Label className="text-xs mb-1">Billing Status</Label>
            <SearchableSelect value={filters.billing_status} onValueChange={(v) => upd("billing_status", v)} options={[{value:"all",label:"All"}, ...((bstatuses||[]).map((p:any)=>({value:p.name,label:p.name})))]} className="h-9" />
          </div>
          <div>
            <Label className="text-xs mb-1">Zone</Label>
            <SearchableSelect value={filters.zone_id} onValueChange={(v) => upd("zone_id", v)} options={[{value:"all",label:"All"}, ...((zones||[]).map((p:any)=>({value:p.id,label:p.name})))]} className="h-9" />
          </div>
          <div>
            <Label className="text-xs mb-1">Sub Zone</Label>
            <SearchableSelect value={filters.sub_zone_id} onValueChange={(v) => upd("sub_zone_id", v)} options={[{value:"all",label:"All"}, ...((subZones||[]).map((p:any)=>({value:p.id,label:p.name})))]} className="h-9" />
          </div>
          <div>
            <Label className="text-xs mb-1">Box</Label>
            <SearchableSelect value={filters.box_id} onValueChange={(v) => upd("box_id", v)} options={[{value:"all",label:"All"}, ...((boxes||[]).map((p:any)=>({value:p.id,label:p.name})))]} className="h-9" />
          </div>
          <div>
            <Label className="text-xs mb-1">Affiliator</Label>
            <SearchableSelect value={filters.affiliator_id} onValueChange={(v) => upd("affiliator_id", v)} options={[{value:"all",label:"All"}, ...((affiliates||[]).map((p:any)=>({value:p.id,label:p.name})))]} className="h-9" />
          </div>
          <div><Label className="text-xs">Creation From</Label><Input type="date" value={filters.creation_from} onChange={(e) => upd("creation_from", e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">Creation To</Label><Input type="date" value={filters.creation_to} onChange={(e) => upd("creation_to", e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">Receive From</Label><Input type="date" value={filters.receive_from} onChange={(e) => upd("receive_from", e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">Receive To</Label><Input type="date" value={filters.receive_to} onChange={(e) => upd("receive_to", e.target.value)} className="h-9" /></div>
          <div className="md:col-span-4 flex justify-end">
            <Button onClick={() => setApplied({ ...filters })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply Filters</Button>
          </div>
        </div>
      }
      columns={[
        { key: "receive_date", label: "R.Date", format: fmtDate },
        { key: "client_code", label: "C.Code" },
        { key: "user_id", label: "ID/IP" },
        { key: "name", label: "Name" },
        { key: "mobile", label: "Mobile" },
        { key: "zone", label: "Zone" },
        { key: "sub_zone", label: "SubZone" },
        { key: "box", label: "Box" },
        { key: "package", label: "Package" },
        { key: "b_status", label: "B.Status" },
        { key: "affiliator", label: "Affiliator" },
        { key: "trx_id", label: "TrxId" },
        { key: "monthly_bill", label: "MonthlyBill", align: "right", format: fmtMoney },
        { key: "received", label: "Received", align: "right", format: fmtMoney },
        { key: "receipt_no", label: "Receipt No" },
        { key: "payment_method", label: "PaymentGateway" },
        { key: "note", label: "Note" },
      ]}
      rows={rows}
      loading={isLoading}
      totalsRow={{
        receive_date: "Total",
        monthly_bill: fmtMoney(totals.monthly_bill),
        received: fmtMoney(totals.received),
      }}
      rowKey={(r) => r.id}
    />
  );
}
