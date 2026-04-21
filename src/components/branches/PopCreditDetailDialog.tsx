import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { exportCSV, exportPDF, fmtMoney, type Column } from "@/lib/reportExport";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  popId: string | undefined;
  date: string | undefined;
  popName?: string;
}

export default function PopCreditDetailDialog({ open, onOpenChange, popId, date, popName }: Props) {
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [subZoneFilter, setSubZoneFilter] = useState<string>("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["pop-credit-detail", popId, date],
    enabled: !!open && !!popId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pop_daily_charges" as any)
        .select("*")
        .eq("pop_id", popId!)
        .eq("charge_date", date!)
        .order("client_username", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const zones = useMemo(() => Array.from(new Set(rows.map((r) => r.zone_name).filter(Boolean))), [rows]);
  const subZones = useMemo(() => Array.from(new Set(rows.map((r) => r.sub_zone_name).filter(Boolean))), [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (zoneFilter !== "all" && r.zone_name !== zoneFilter) return false;
      if (subZoneFilter !== "all" && r.sub_zone_name !== subZoneFilter) return false;
      return true;
    });
  }, [rows, zoneFilter, subZoneFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.monthly += Number(r.monthly_rate) || 0;
        acc.daily += Number(r.daily_rate) || 0;
        acc.amount += Number(r.charged_amount) || 0;
        return acc;
      },
      { monthly: 0, daily: 0, amount: 0 },
    );
  }, [filtered]);

  const columns: Column[] = [
    { key: "sl", label: "Serial" },
    { key: "client_username", label: "UserName" },
    { key: "zone_name", label: "Zone" },
    { key: "sub_zone_name", label: "Sub-Zone" },
    { key: "package_name", label: "Package" },
    { key: "profile", label: "Profile" },
    { key: "protocol_type", label: "Protocol" },
    { key: "server_name", label: "Server" },
    { key: "monthly_rate", label: "Monthly Rate", format: fmtMoney },
    { key: "daily_rate", label: "Daily Rate", format: fmtMoney },
    { key: "charged_amount", label: "Credited Amount", format: fmtMoney },
    { key: "charged_by", label: "Credited By" },
    { key: "remarks", label: "Remarks" },
  ];

  const exportRows = filtered.map((r, i) => ({ ...r, sl: i + 1 }));
  const title = `Credit Detail - ${popName || "POP"} - ${date}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Credited User Detail — {date}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Zone</label>
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Sub-Zone</label>
            <Select value={subZoneFilter} onValueChange={setSubZoneFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub-Zones</SelectItem>
                {subZones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => exportCSV(title, columns, exportRows)}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportPDF(title, columns, exportRows)}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SL</TableHead>
              <TableHead>UserName</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Sub-Zone</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Server</TableHead>
              <TableHead className="text-right">Monthly Rate</TableHead>
              <TableHead className="text-right">Daily Rate</TableHead>
              <TableHead className="text-right">Credited</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{r.client_username || "-"}</TableCell>
                <TableCell>{r.zone_name || "-"}</TableCell>
                <TableCell>{r.sub_zone_name || "-"}</TableCell>
                <TableCell>{r.package_name || "-"}</TableCell>
                <TableCell>{r.profile || "-"}</TableCell>
                <TableCell>{r.protocol_type || "-"}</TableCell>
                <TableCell>{r.server_name || "-"}</TableCell>
                <TableCell className="text-right font-mono">৳{fmtMoney(r.monthly_rate)}</TableCell>
                <TableCell className="text-right font-mono">৳{fmtMoney(r.daily_rate)}</TableCell>
                <TableCell className="text-right font-mono font-bold text-destructive">৳{fmtMoney(r.charged_amount)}</TableCell>
                <TableCell className="text-xs">{r.charged_by || "system"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.remarks || "-"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-6">কোন credit charge পাওয়া যায়নি</TableCell></TableRow>
            )}
            {filtered.length > 0 && (
              <TableRow className="bg-muted/40 font-bold">
                <TableCell colSpan={8} className="text-right">Total ({filtered.length} users)</TableCell>
                <TableCell className="text-right font-mono">৳{fmtMoney(totals.monthly)}</TableCell>
                <TableCell className="text-right font-mono">৳{fmtMoney(totals.daily)}</TableCell>
                <TableCell className="text-right font-mono text-destructive">৳{fmtMoney(totals.amount)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
