import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Edit2, Info, Power, PowerOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ProcessRow {
  id: string;
  branch_id: string | null;
  process_key: string;
  process_name: string;
  execute_at: string;
  interval_type: string;
  execution_day: string | null;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  notes: string | null;
}

const INTERVAL_LABELS: Record<string, string> = {
  hourly: "প্রতি ঘণ্টা", daily: "প্রতিদিন", weekly: "প্রতি সপ্তাহ", monthly: "প্রতি মাস",
};

export default function AutomaticProcess() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProcessRow | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["automatic-processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automatic_processes")
        .select("*")
        .order("process_name");
      if (error) throw error;
      return (data ?? []) as ProcessRow[];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<ProcessRow> & { id: string }) => {
      const { error } = await supabase.from("automatic_processes").update(patch).eq("id", patch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automatic-processes"] });
      toast.success("সংরক্ষণ হয়েছে");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">অটোমেটিক প্রসেস</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; অটোমেটিক প্রসেস (Schedulers)</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" /> Automatic Process List
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="text-left px-4 py-2.5 w-12">SL</th>
                <th className="text-left px-4 py-2.5">Process Name</th>
                <th className="text-left px-4 py-2.5">Execute At</th>
                <th className="text-left px-4 py-2.5">Interval</th>
                <th className="text-left px-4 py-2.5">Execution Day</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5 w-40">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium">{r.process_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.execute_at?.slice(0, 5)}</td>
                  <td className="px-4 py-2.5">{INTERVAL_LABELS[r.interval_type] ?? r.interval_type}</td>
                  <td className="px-4 py-2.5">{r.execution_day ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {r.enabled
                      ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">সক্রিয়</Badge>
                      : <Badge variant="secondary">নিষ্ক্রিয়</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Info">
                            <Info className="h-4 w-4 text-blue-600" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 text-xs">
                          <div className="space-y-1">
                            <div><span className="text-muted-foreground">Key:</span> {r.process_key}</div>
                            <div><span className="text-muted-foreground">Last Run:</span> {r.last_run ? new Date(r.last_run).toLocaleString() : "—"}</div>
                            <div><span className="text-muted-foreground">Next Run:</span> {r.next_run ? new Date(r.next_run).toLocaleString() : "—"}</div>
                            {r.notes && <div className="pt-1 border-t">{r.notes}</div>}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => setEditing(r)}>
                        <Edit2 className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        title={r.enabled ? "Disable" : "Enable"}
                        onClick={() => update.mutate({ id: r.id, enabled: !r.enabled })}
                      >
                        {r.enabled
                          ? <PowerOff className="h-4 w-4 text-destructive" />
                          : <Power className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">কোনো প্রসেস নেই</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Edit — {editing?.process_name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Execute At</Label>
                <Input
                  type="time"
                  value={editing.execute_at?.slice(0, 5) ?? ""}
                  onChange={(e) => setEditing({ ...editing, execute_at: e.target.value + ":00" })}
                />
              </div>
              <div>
                <Label className="text-xs">Interval</Label>
                <Select value={editing.interval_type} onValueChange={(v) => setEditing({ ...editing, interval_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">প্রতি ঘণ্টা</SelectItem>
                    <SelectItem value="daily">প্রতিদিন</SelectItem>
                    <SelectItem value="weekly">প্রতি সপ্তাহ</SelectItem>
                    <SelectItem value="monthly">প্রতি মাস</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Execution Day (Optional)</Label>
                <Input
                  placeholder="e.g. Monday / 1 / 15"
                  value={editing.execution_day ?? ""}
                  onChange={(e) => setEditing({ ...editing, execution_day: e.target.value || null })}
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
                <Label className="text-xs">Enabled</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>বাতিল</Button>
            <Button
              onClick={() => editing && update.mutate({
                id: editing.id,
                execute_at: editing.execute_at,
                interval_type: editing.interval_type,
                execution_day: editing.execution_day,
                enabled: editing.enabled,
              })}
              disabled={update.isPending}
              className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]"
            >
              <Save className="h-4 w-4" /> সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
