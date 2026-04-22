import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtMoney } from "@/lib/reportExport";
import { usePopScope } from "@/hooks/usePopScope";

export default function PopDiscount() {
  const { branchId } = usePopScope();
  const [f, setF] = useState({ from: "", to: "" });
  const [a, setA] = useState(f);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-rpt-discount", branchId, a],
    enabled: !!branchId,
    queryFn: async () => {
      let q = supabase
        .from("bill_collections")
        .select("id, amount, discount, created_at, billing:billing_id(amount), client:client_id!inner(client_id, user_id, name, branch_id, zone:zone_id(name), pkg:package_id(name))")
        .eq("client.branch_id", branchId!)
        .gt("discount", 0)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (a.from) q = q.gte("created_at", a.from);
      if (a.to) q = q.lte("created_at", a.to + "T23:59:59");
      const { data } = await q;
      return (data || [])
        .filter((c: any) => c.client && c.client.branch_id === branchId)
        .map((c: any) => ({
          id: c.id,
          code: c.client?.client_id || "",
          user_id: c.client?.user_id || "",
          name: c.client?.name || "",
          zone: c.client?.zone?.name || "",
          package: c.client?.pkg?.name || "",
          bill_amount: Number(c.billing?.amount) || 0,
          discount: Number(c.discount) || 0,
          date: c.created_at,
        }));
    },
  });

  const totals = useMemo(() => ({
    bill_amount: rows.reduce((s, r) => s + r.bill_amount, 0),
    discount: rows.reduce((s, r) => s + r.discount, 0),
  }), [rows]);

  return (
    <ReportLayout
      title="Discount Report"
      breadcrumb="Report > Discount"
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">From Date</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">To Date</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply</Button>
        </div>
      }
      columns={[
        { key: "code", label: "Code" },
        { key: "user_id", label: "ID/IP" },
        { key: "name", label: "Name" },
        { key: "zone", label: "Zone" },
        { key: "package", label: "Package" },
        { key: "bill_amount", label: "Bill Amount", align: "right", format: fmtMoney },
        { key: "discount", label: "Discount", align: "right", format: fmtMoney },
        { key: "date", label: "Date", format: fmtDate },
      ]}
      rows={rows}
      loading={isLoading}
      totalsRow={{ code: "Total", bill_amount: fmtMoney(totals.bill_amount), discount: fmtMoney(totals.discount) }}
      rowKey={(r) => r.id}
    />
  );
}
