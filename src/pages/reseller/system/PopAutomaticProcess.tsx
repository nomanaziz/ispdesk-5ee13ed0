import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePopScope } from "@/hooks/usePopScope";
import { useState } from "react";
import { Bot, Edit, Info, Save } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PROCESSES = [
  { process_key: "package_scheduler", process_name: "Package Scheduler", execute_at: "00:05", interval_type: "daily" },
  { process_key: "status_scheduler", process_name: "Status Scheduler", execute_at: "00:10", interval_type: "daily" },
  { process_key: "validate_payments", process_name: "Validate Payments", execute_at: "00:15", interval_type: "hourly" },
  { process_key: "disable_unpaid", process_name: "Disable Unpaid Clients", execute_at: "01:00", interval_type: "daily" },
  { process_key: "send_sms_before_expiry", process_name: "Send SMS Before Expiry", execute_at: "09:00", interval_type: "daily" },
  { process_key: "prepaid_auto_renewal", process_name: "Prepaid Auto Renewal", execute_at: "00:30", interval_type: "daily" },
];

export default function PopAutomaticProcess() {
  const { branchId } = usePopScope();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [] } = useQuery({
    queryKey: ["pop-automatic-processes", branchId],
    enabled: !!branchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("automatic_processes")
        .select("*")
        .eq("branch_id", branchId)
        .order("process_name");
      return data || [];
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch missing");
      const inserts = DEFAULT_PROCESSES.map((p) => ({ ...p, branch_id: branchId, enabled: true }));
      const { error } = await supabase.from("automatic_processes").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pop-automatic-processes", branchId] });
      toast.success("Default processes seeded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (row: any) => {
      const { error } = await supabase.from("automatic_processes")
        .update({
          execute_at: row.execute_at,
          interval_type: row.interval_type,
          execution_day: row.execution_day,
          enabled: row.enabled,
          notes: row.notes,
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pop-automatic-processes", branchId] });
      setEditing(null);
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("automatic_processes").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pop-automatic-processes", branchId] }),
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">অটোমেটিক প্রসেস</h1>
            <p className="text-sm text-muted-foreground">Scheduled tasks for this POP</p>
          </div>
        </div>
        {rows.length === 0 && (
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            Seed Default Processes
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Process List</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Process Name</TableHead>
                <TableHead>Execute At</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No processes — seed defaults to start</TableCell></TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.process_name}</TableCell>
                  <TableCell>{r.execute_at}</TableCell>
                  <TableCell><Badge variant="outline">{r.interval_type}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.last_run ? new Date(r.last_run).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Switch checked={r.enabled} onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, enabled: v })} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" title={r.notes || "No notes"}><Info className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Edit className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.process_name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Execute At</Label>
                <Input type="time" value={editing.execute_at} onChange={(e) => setEditing({ ...editing, execute_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Interval</Label>
                <Select value={editing.interval_type} onValueChange={(v) => setEditing({ ...editing, interval_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Execution Day (weekly/monthly)</Label>
                <Input value={editing.execution_day || ""} onChange={(e) => setEditing({ ...editing, execution_day: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate(editing)} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
