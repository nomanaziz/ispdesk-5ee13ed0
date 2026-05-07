import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, Edit2, Info, Power, PowerOff, Save, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ProcessRow {
  id: string;
  branch_id: string | null;
  scope: string;
  process_key: string;
  process_name: string;
  execute_at: string | null;
  interval_type: string;
  execution_day: string | null;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  notes: string | null;
}

const INTERVAL_OPTIONS = [
  { value: "minutely", label: "Minutely" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SCOPES = [
  { value: "system", label: "System" },
  { value: "admin_customer", label: "Admin Customer" },
  { value: "pop", label: "POP" },
  { value: "pop_customer", label: "POP Customer" },
  { value: "bandwidth_pop", label: "Bandwidth POP" },
];

export default function AutomaticProcess() {
  const qc = useQueryClient();
  const [scope, setScope] = useState("system");
  const [editing, setEditing] = useState<ProcessRow | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["automatic-processes", scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automatic_processes")
        .select("*")
        .eq("scope", scope)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">অটোমেটিক প্রসেস</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; অটোমেটিক প্রসেস (Application Auto Process & Scheduling)</p>
        </div>
      </div>

      <Tabs value={scope} onValueChange={setScope}>
        <TabsList className="bg-muted/50 flex-wrap h-auto">
          {SCOPES.map(s => (
            <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        {SCOPES.map(s => (
          <TabsContent key={s.value} value={s.value} className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> {s.label} — Automatic Process List
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="text-left px-4 py-2.5 w-12">SL</th>
                      <th className="text-left px-4 py-2.5">Branch</th>
                      <th className="text-left px-4 py-2.5">Process Name</th>
                      <th className="text-left px-4 py-2.5 w-24">Execute At</th>
                      <th className="text-left px-4 py-2.5 w-24">Interval</th>
                      <th className="text-left px-4 py-2.5 w-32">Execution Day</th>
                      <th className="text-right px-4 py-2.5 w-44">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">লোড হচ্ছে...</td></tr>
                    )}
                    {!isLoading && rows.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                        এই scope এর জন্য এখনো কোনো process configure করা হয়নি
                      </td></tr>
                    )}
                    {!isLoading && rows.map((r, i) => (
                      <tr key={r.id} className={`border-t hover:bg-muted/30 ${!r.enabled ? "opacity-60" : ""}`}>
                        <td className="px-4 py-2.5">{i + 1}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">Main Branch</td>
                        <td className="px-4 py-2.5 font-medium">{r.process_name}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {r.execute_at ? r.execute_at.slice(0, 5) : <span className="text-muted-foreground">Default</span>}
                        </td>
                        <td className="px-4 py-2.5 capitalize">{r.interval_type}</td>
                        <td className="px-4 py-2.5 capitalize text-muted-foreground">{r.execution_day ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex gap-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => setEditing(r)}>
                              <Edit2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" title="Info">
                                  <Info className="h-4 w-4 text-blue-600" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 text-xs">
                                <div className="space-y-1">
                                  <div><span className="text-muted-foreground">Key:</span> {r.process_key}</div>
                                  <div><span className="text-muted-foreground">Status:</span> {r.enabled ? "সক্রিয়" : "নিষ্ক্রিয়"}</div>
                                  <div><span className="text-muted-foreground">Last Run:</span> {r.last_run ? new Date(r.last_run).toLocaleString() : "—"}</div>
                                  <div><span className="text-muted-foreground">Next Run:</span> {r.next_run ? new Date(r.next_run).toLocaleString() : "—"}</div>
                                  {r.notes && <div className="pt-1 border-t">{r.notes}</div>}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              title={r.enabled ? "Disable" : "Enable"}
                              onClick={() => update.mutate({ id: r.id, enabled: !r.enabled })}
                            >
                              {r.enabled
                                ? <Eye className="h-4 w-4 text-blue-500" />
                                : <PowerOff className="h-4 w-4 text-destructive" />}
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              title="Run Now"
                              onClick={() => toast.info("Manual run শীঘ্রই যোগ করা হবে")}
                            >
                              <Play className="h-4 w-4 text-amber-500 fill-amber-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isLoading && rows.length > 0 && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/20">
                  Showing {rows.length} of {rows.length} entries
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Edit — {editing?.process_name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Execute At (যেই সময় দিবেন সেই সময়েই চলবে)</Label>
                <Input
                  type="time"
                  value={editing.execute_at ? editing.execute_at.slice(0, 5) : ""}
                  onChange={(e) => setEditing({ ...editing, execute_at: e.target.value ? e.target.value + ":00" : null })}
                  placeholder="Default (interval-based)"
                />
                <p className="text-[10px] text-muted-foreground mt-1">খালি রাখলে interval অনুযায়ী চলবে (e.g. hourly/minutely)</p>
              </div>
              <div>
                <Label className="text-xs">Interval</Label>
                <Select value={editing.interval_type} onValueChange={(v) => setEditing({ ...editing, interval_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Execution Day</Label>
                <Select
                  value={editing.execution_day ?? "tomorrow"}
                  onValueChange={(v) => setEditing({ ...editing, execution_day: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  </SelectContent>
                </Select>
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
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="h-4 w-4" /> সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
