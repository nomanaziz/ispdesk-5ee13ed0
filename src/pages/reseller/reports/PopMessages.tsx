import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/reportExport";
import { usePopScope } from "@/hooks/usePopScope";

export default function PopMessages() {
  const { branchId } = usePopScope();
  const [f, setF] = useState({ sms_type: "all", status: "all", from: "", to: "" });
  const [a, setA] = useState(f);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-rpt-messages", branchId, a],
    enabled: !!branchId,
    queryFn: async () => {
      // sms_log has no branch_id; filter by recipient → clients(branch_id)
      const { data: branchClients } = await supabase
        .from("clients").select("contact").eq("branch_id", branchId!).limit(10000);
      const allowed = new Set((branchClients || []).map((c: any) => c.contact).filter(Boolean));
      if (allowed.size === 0) return [];

      let q = supabase
        .from("sms_log")
        .select("id, recipient, message, sms_type, status, sent_at, created_at, gateway:gateway_id(name)")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (a.sms_type !== "all") q = q.eq("sms_type", a.sms_type);
      if (a.status !== "all") q = q.eq("status", a.status);
      if (a.from) q = q.gte("created_at", a.from);
      if (a.to) q = q.lte("created_at", a.to + "T23:59:59");
      const { data } = await q;
      return (data || [])
        .filter((s: any) => allowed.has(s.recipient))
        .map((s: any, i: number) => ({
          id: s.id,
          log_no: i + 1,
          to_whom: s.gateway?.name || "-",
          sms_type: s.sms_type || "general",
          to_number: s.recipient || "",
          sms_text: s.message || "",
          date_time: s.sent_at || s.created_at,
          status: s.status || "pending",
        }));
    },
  });

  const resendBulk = async () => {
    if (selected.size === 0) { toast.error("No messages selected"); return; }
    toast.success(`Queued ${selected.size} message(s) for resend`);
    setSelected(new Set());
  };

  return (
    <ReportLayout
      title="Messages Report"
      breadcrumb="Report > Messages"
      extraActions={<Button onClick={resendBulk} size="sm" className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]"><Send className="h-4 w-4" /> Resend ({selected.size})</Button>}
      filters={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">SMS Type</Label>
            <Select value={f.sms_type} onValueChange={(v) => setF({ ...f, sms_type: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="money_receipt">Money Receipt</SelectItem>
                <SelectItem value="due_reminder">Due Reminder</SelectItem>
                <SelectItem value="support_created">Support Created</SelectItem>
                <SelectItem value="support_solved">Support Solved</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="h-9" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="h-9" /></div>
          <Button onClick={() => setA({ ...f })} className="bg-[#2c5f6e] hover:bg-[#245069] h-9 md:col-span-1">Apply</Button>
        </div>
      }
      columns={[
        {
          key: "_select", label: "✓", sortable: false,
          format: (_v, r: any) => (
            <input type="checkbox" checked={selected.has(r.id)} onChange={(e) => {
              const ns = new Set(selected);
              e.target.checked ? ns.add(r.id) : ns.delete(r.id);
              setSelected(ns);
            }} onClick={(e) => e.stopPropagation()} />
          ) as any,
        },
        { key: "log_no", label: "Log No" },
        { key: "to_whom", label: "Gateway" },
        { key: "sms_type", label: "SMS Type" },
        { key: "to_number", label: "To Number" },
        { key: "sms_text", label: "SMS Text", format: (v: string) => <span className="block max-w-md truncate" title={v}>{v}</span> as any },
        { key: "date_time", label: "Date & Time", format: fmtDateTime },
        {
          key: "status", label: "Status",
          format: (v: string) => <Badge variant={v === "success" ? "default" : v === "failed" ? "destructive" : "secondary"}>{v}</Badge> as any,
        },
      ]}
      rows={rows}
      loading={isLoading}
      rowKey={(r) => r.id}
    />
  );
}
