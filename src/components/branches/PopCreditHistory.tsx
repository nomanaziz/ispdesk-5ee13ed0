import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callPortal } from "@/lib/portalApi";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Download, FileText } from "lucide-react";
import { exportCSV, exportPDF, fmtMoney, type Column } from "@/lib/reportExport";
import PopCreditDetailDialog from "./PopCreditDetailDialog";

interface Props {
  popId: string | undefined;
  popName?: string;
  /** "admin" shows POP-name column when used in cross-POP context (not used here yet) */
  mode?: "admin" | "pop";
}

interface DailyRollup {
  charge_date: string;
  total_users: number;
  packages: string;
  profiles: string;
  protocols: string;
  servers: string;
  total_amount: number;
}

export default function PopCreditHistory({ popId, popName, mode = "admin" }: Props) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  const [detailDate, setDetailDate] = useState<string | undefined>();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pop-credit-history", mode, popId, from, to],
    enabled: mode === "pop" ? true : !!popId,
    queryFn: async () => {
      if (mode === "pop") {
        const res = await callPortal<{ rows: any[] }>("pop_get_credit_history", { from, to });
        return res?.rows ?? [];
      }
      const { data, error } = await supabase
        .from("pop_daily_charges" as any)
        .select("charge_date, package_name, profile, protocol_type, server_name, charged_amount, client_id")
        .eq("pop_id", popId!)
        .gte("charge_date", from)
        .lte("charge_date", to)
        .order("charge_date", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rollups = useMemo<DailyRollup[]>(() => {
    const map = new Map<string, any>();
    for (const r of rows) {
      const k = r.charge_date;
      if (!map.has(k)) {
        map.set(k, {
          charge_date: k,
          users: new Set<string>(),
          packages: new Set<string>(),
          profiles: new Set<string>(),
          protocols: new Set<string>(),
          servers: new Set<string>(),
          total_amount: 0,
        });
      }
      const e = map.get(k);
      if (r.client_id) e.users.add(r.client_id);
      if (r.package_name) e.packages.add(r.package_name);
      if (r.profile) e.profiles.add(r.profile);
      if (r.protocol_type) e.protocols.add(r.protocol_type);
      if (r.server_name) e.servers.add(r.server_name);
      e.total_amount += Number(r.charged_amount) || 0;
    }
    return Array.from(map.values()).map((e) => ({
      charge_date: e.charge_date,
      total_users: e.users.size,
      packages: Array.from(e.packages).join(", "),
      profiles: Array.from(e.profiles).join(", "),
      protocols: Array.from(e.protocols).join(", "),
      servers: Array.from(e.servers).join(", "),
      total_amount: e.total_amount,
    }));
  }, [rows]);

  const grandTotal = rollups.reduce((s, r) => s + r.total_amount, 0);

  const columns: Column[] = [
    { key: "charge_date", label: "Date" },
    { key: "total_users", label: "Total User" },
    { key: "total_credited_users", label: "Total Credited User" },
    { key: "packages", label: "Packages" },
    { key: "profiles", label: "Profiles" },
    { key: "protocols", label: "Protocol Types" },
    { key: "servers", label: "Servers" },
    { key: "total_amount", label: "Total Credited Amount", format: fmtMoney },
  ];
  const exportRows = rollups.map((r) => ({ ...r, total_credited_users: r.total_users }));
  const title = `Credit History - ${popName || "POP"} - ${from} to ${to}`;

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => exportCSV(title, columns, exportRows)}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportPDF(title, columns, exportRows)}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total User</TableHead>
                <TableHead className="text-right">Total Credited User</TableHead>
                <TableHead>Packages</TableHead>
                <TableHead>Profiles</TableHead>
                <TableHead>Protocols</TableHead>
                <TableHead>Servers</TableHead>
                <TableHead className="text-right">Total Credited</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">লোড হচ্ছে...</TableCell></TableRow>
              )}
              {!isLoading && rollups.map((r) => (
                <TableRow key={r.charge_date}>
                  <TableCell className="font-mono text-xs">{r.charge_date}</TableCell>
                  <TableCell className="text-right">{r.total_users}</TableCell>
                  <TableCell className="text-right">{r.total_users}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={r.packages}>{r.packages || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={r.profiles}>{r.profiles || "-"}</TableCell>
                  <TableCell className="text-xs">{r.protocols || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={r.servers}>{r.servers || "-"}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-destructive">৳{fmtMoney(r.total_amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailDate(r.charge_date)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && rollups.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">এই date range-এ কোন credit charge নেই</TableCell></TableRow>
              )}
              {rollups.length > 0 && (
                <TableRow className="bg-muted/40 font-bold">
                  <TableCell colSpan={7} className="text-right">Grand Total</TableCell>
                  <TableCell className="text-right font-mono text-destructive">৳{fmtMoney(grandTotal)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PopCreditDetailDialog
        open={!!detailDate}
        onOpenChange={(v) => !v && setDetailDate(undefined)}
        popId={popId}
        date={detailDate}
        popName={popName}
        mode={mode}
      />
    </div>
  );
}
