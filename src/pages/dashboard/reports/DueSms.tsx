import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/reportExport";

export default function DueSms() {
  const [f, setF] = useState({ from: "", to: "" });
  const [a, setA] = useState(f);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rpt-due-sms", a],
    queryFn: async () => {
      let q = supabase
        .from("sms_log")
        .select("id, recipient, message, sent_at, created_at")
        .eq("sms_type", "due_reminder")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (a.from) q = q.gte("created_at", a.from);
      if (a.to) q = q.lte("created_at", a.to + "T23:59:59");
      const { data } = await q;
      const recipients = Array.from(new Set((data || []).map((s: any) => s.recipient).filter(Boolean)));
      const { data: clients } = recipients.length
        ? await supabase.from("clients").select("client_id, name, contact, billing_date").in("contact", recipients)
        : { data: [] as any[] };
      const map = new Map((clients || []).map((c: any) => [c.contact, c]));
      return (data || []).map((s: any, i: number) => {
        const c = map.get(s.recipient) || {};
        const today = new Date();
        const billDay = c.billing_date || 1;
        const daysBefore = Math.max(0, billDay - today.getDate());
        return {
          id: s.id,
          sn: i + 1,
          date_time: s.sent_at || s.created_at,
          client_code: c.client_id || "",
          client_name: c.name || "",
          mobile: s.recipient || "",
          billing_month: today.toLocaleString("en-GB", { month: "long", year: "numeric" }),
          days_before: daysBefore,
        };
      });
    },
  });

  return (
    <ReportLayout
      title="Due Customer SMS"
      breadcrumb="Report > Due Customer SMS"
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">From</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9">Apply</Button>
        </div>
      }
      columns={[
        { key: "sn", label: "SN" },
        { key: "date_time", label: "Date & Time", format: fmtDateTime },
        { key: "client_code", label: "Client Code" },
        { key: "client_name", label: "Client Name" },
        { key: "mobile", label: "Mobile" },
        { key: "billing_month", label: "Billing Month" },
        { key: "days_before", label: "Days Before", align: "right" },
      ]}
      rows={rows}
      loading={isLoading}
      rowKey={(r) => r.id}
    />
  );
}
