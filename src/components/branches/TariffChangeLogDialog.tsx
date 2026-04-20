import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { History } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tariffId: string | null;
  tariffName: string;
}

export function TariffChangeLogDialog({ open, onOpenChange, tariffId, tariffName }: Props) {
  const [serverFilter, setServerFilter] = useState<string>("all");
  const [packageFilter, setPackageFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["tariff-change-logs", tariffId],
    enabled: open && !!tariffId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_tariff_change_logs")
        .select("*")
        .eq("tariff_id", tariffId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Resolve changed_by user names
  const userIds = useMemo(
    () => Array.from(new Set((logs ?? []).map((l: any) => l.changed_by).filter(Boolean))),
    [logs],
  );

  const { data: profiles } = useQuery({
    queryKey: ["log-changed-by-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds as string[]);
      return data ?? [];
    },
  });
  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      m[p.user_id] = p.full_name?.trim() || p.email?.split("@")[0] || "—";
    });
    return m;
  }, [profiles]);

  const servers = useMemo(
    () => Array.from(new Set((logs ?? []).map((l: any) => l.server_name).filter(Boolean))),
    [logs],
  );
  const packagesList = useMemo(
    () => Array.from(new Set((logs ?? []).map((l: any) => l.package_name).filter(Boolean))),
    [logs],
  );

  const filtered = (logs ?? []).filter((l: any) => {
    if (serverFilter !== "all" && l.server_name !== serverFilter) return false;
    if (packageFilter !== "all" && l.package_name !== packageFilter) return false;
    return true;
  });

  const isChanged = (log: any, field: string) =>
    Array.isArray(log.changed_fields) && log.changed_fields.includes(field);

  const cls = (log: any, field: string) =>
    isChanged(log, field) ? "font-bold text-destructive" : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {tariffName} change logs
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Server</Label>
            <Select value={serverFilter} onValueChange={setServerFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Servers</SelectItem>
                {servers.map((s) => (
                  <SelectItem key={s as string} value={s as string}>{s as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Package</Label>
            <Select value={packageFilter} onValueChange={setPackageFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Packages</SelectItem>
                {packagesList.map((p) => (
                  <SelectItem key={p as string} value={p as string}>{p as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground ml-auto">
            Total: {filtered.length} entries
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S/N</TableHead>
                <TableHead>Tariff Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned POPs</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Profile Speed</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Min Activation</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Changed On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={15} className="text-center py-6">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={15} className="text-center py-6 text-muted-foreground">কোনো log নেই</TableCell></TableRow>
              ) : (
                filtered.map((l: any, i: number) => (
                  <TableRow key={l.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className={cls(l, "tariff_name")}>{l.tariff_name ?? "—"}</TableCell>
                    <TableCell className={cls(l, "tariff_type")}>{l.tariff_type ?? "—"}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate" title={l.assigned_pops ?? ""}>{l.assigned_pops ?? "—"}</TableCell>
                    <TableCell className={cls(l, "package_name")}>{l.package_name ?? "—"}</TableCell>
                    <TableCell className={cls(l, "server_name")}>{l.server_name ?? "—"}</TableCell>
                    <TableCell className={cls(l, "profile")}>{l.profile ?? "—"}</TableCell>
                    <TableCell className={cls(l, "profile_speed")}>{l.profile_speed ?? "—"}</TableCell>
                    <TableCell className={cls(l, "package_rate") + " font-mono"}>৳{l.package_rate ?? 0}</TableCell>
                    <TableCell className={cls(l, "validity_days")}>{l.validity_days ?? "—"}</TableCell>
                    <TableCell className={cls(l, "min_activation_days")}>{l.min_activation_days ?? "—"}</TableCell>
                    <TableCell className={cls(l, "effective_from") + " text-xs"}>{l.effective_from ?? "—"}</TableCell>
                    <TableCell className={cls(l, "effective_to") + " text-xs"}>{l.effective_to ?? "—"}</TableCell>
                    <TableCell className="text-xs">{l.changed_by ? (profileMap[l.changed_by] ?? "—") : "System"}</TableCell>
                    <TableCell className="text-xs">{l.changed_at ? format(new Date(l.changed_at), "dd MMM yyyy HH:mm") : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
