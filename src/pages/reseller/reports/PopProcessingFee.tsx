import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { fmtDateTime, fmtMoney } from "@/lib/reportExport";
import { usePopScope } from "@/hooks/usePopScope";

interface FeeConfig {
  default: { fee_pct: number; borne_by: "company" | "client" | "split"; split_pct: number };
  resellers: Array<{ branch_id: string; fee_pct: number; borne_by: "company" | "client" | "split"; split_pct: number }>;
  portal_clients: { fee_pct: number; borne_by: "company" | "client" | "split"; split_pct: number };
}

const DEFAULT_FEE: FeeConfig = {
  default: { fee_pct: 1.5, borne_by: "company", split_pct: 50 },
  resellers: [],
  portal_clients: { fee_pct: 1.5, borne_by: "company", split_pct: 50 },
};

export default function PopProcessingFee() {
  const { branchId } = usePopScope();
  const { value: cfg } = useSystemSetting<FeeConfig>("processing_fee_config", DEFAULT_FEE);
  const [f, setF] = useState({ user_type: "all", from: "", to: "" });
  const [a, setA] = useState(f);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-rpt-pfee", branchId, a],
    enabled: !!branchId,
    queryFn: async () => {
      let q = supabase
        .from("bill_collections")
        .select("id, amount, payment_method, transaction_id, created_at, created_by, client:client_id!inner(name, branch_id)")
        .not("payment_method", "is", null)
        .eq("client.branch_id", branchId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (a.from) q = q.gte("created_at", a.from);
      if (a.to) q = q.lte("created_at", a.to + "T23:59:59");
      const { data } = await q;
      return (data || [])
        .filter((c: any) => c.client && c.client.branch_id === branchId)
        .map((c: any) => {
          const bId = c.client?.branch_id;
          const rConf = cfg.resellers.find((r) => r.branch_id === bId);
          const conf = rConf || cfg.default;
          const paid = Number(c.amount) || 0;
          const feeAmt = (paid * conf.fee_pct) / 100;
          const clientShare = conf.borne_by === "client" ? feeAmt : conf.borne_by === "split" ? (feeAmt * conf.split_pct) / 100 : 0;
          const companyShare = feeAmt - clientShare;
          return {
            id: c.id,
            trx_no: c.transaction_id || "-",
            p_utype: "Reseller",
            provider: c.payment_method || "-",
            gateway: c.payment_method || "-",
            fee_type: conf.borne_by,
            paid_amount: paid,
            fee_pct: conf.fee_pct,
            fee_amount: feeAmt,
            client_share: clientShare,
            company_share: companyShare,
            stl_amount: paid - companyShare,
            created_on: c.created_at,
          };
        });
    },
  });

  const totals = useMemo(() => ({
    paid_amount: rows.reduce((s, r) => s + r.paid_amount, 0),
    fee_amount: rows.reduce((s, r) => s + r.fee_amount, 0),
    company_share: rows.reduce((s, r) => s + r.company_share, 0),
    client_share: rows.reduce((s, r) => s + r.client_share, 0),
    stl_amount: rows.reduce((s, r) => s + r.stl_amount, 0),
  }), [rows]);

  return (
    <ReportLayout
      title="Payment Processing Fee Report"
      breadcrumb="Report > Pay. Processing Fee"
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">User Type</Label>
            <Select value={f.user_type} onValueChange={(v) => setF({ ...f, user_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="reseller">Reseller</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply</Button>
        </div>
      }
      columns={[
        { key: "trx_no", label: "TrxNo" },
        { key: "p_utype", label: "P.UType" },
        { key: "provider", label: "Provider" },
        { key: "gateway", label: "Gateway" },
        { key: "fee_type", label: "Fee Type" },
        { key: "paid_amount", label: "PaidAmount", align: "right", format: fmtMoney },
        { key: "fee_pct", label: "Fee%", align: "right", format: (v) => `${v}%` },
        { key: "fee_amount", label: "FeeAmount", align: "right", format: fmtMoney },
        { key: "client_share", label: "Client Share", align: "right", format: fmtMoney },
        { key: "company_share", label: "P.P.FeeAmount", align: "right", format: fmtMoney },
        { key: "stl_amount", label: "STL.Amount", align: "right", format: fmtMoney },
        { key: "created_on", label: "CreatedOn", format: fmtDateTime },
      ]}
      rows={rows}
      loading={isLoading}
      totalsRow={{
        trx_no: "Total",
        paid_amount: fmtMoney(totals.paid_amount),
        fee_amount: fmtMoney(totals.fee_amount),
        client_share: fmtMoney(totals.client_share),
        company_share: fmtMoney(totals.company_share),
        stl_amount: fmtMoney(totals.stl_amount),
      }}
      rowKey={(r) => r.id}
    />
  );
}
