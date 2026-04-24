import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CABLE_CORE_COLORS, CABLE_TYPES } from "./nodeStyles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EdgeData {
  id?: string;
  source_node_id: string;
  target_node_id: string;
  cable_type?: string | null;
  core_color?: string | null;
  core_no?: number | null;
  length_m?: number | null;
  start_point?: string | null;
  end_point?: string | null;
  remarks?: string | null;
  color_code?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  edge: EdgeData | null;
  sourceLabel?: string;
  targetLabel?: string;
  onSaved: () => void;
}

export function EdgeDialog({ open, onOpenChange, edge, sourceLabel, targetLabel, onSaved }: Props) {
  const [form, setForm] = useState<EdgeData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open && edge) setForm({ ...edge }); }, [open, edge]);

  if (!form) return null;

  const update = (k: keyof EdgeData, v: any) => setForm((f) => f ? { ...f, [k]: v } : f);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        source_node_id: form.source_node_id,
        target_node_id: form.target_node_id,
        cable_type: form.cable_type || "fiber",
        core_color: form.core_color || null,
        core_no: form.core_no ?? null,
        length_m: form.length_m ?? null,
        start_point: form.start_point || null,
        end_point: form.end_point || null,
        remarks: form.remarks || null,
        color_code: CABLE_CORE_COLORS.find((c) => c.name === form.core_color)?.hex || "#64748B",
        connection_type: "fiber",
        status: "active",
      };

      if (form.id) {
        const { error } = await supabase.from("network_edges").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("network_edges").insert(payload);
        if (error) throw error;
      }
      toast.success("Cable saved");
      onSaved();
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!form.id) return;
    if (!confirm("এই cable/connection delete হবে। নিশ্চিত?")) return;
    const { error } = await supabase.from("network_edges").delete().eq("id", form.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); onSaved(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Cable" : "Add Cable / Connection"}</DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground mb-2">
          <span className="font-medium">{sourceLabel || "Source"}</span> → <span className="font-medium">{targetLabel || "Target"}</span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cable Type</Label>
              <Select value={form.cable_type || "fiber"} onValueChange={(v) => update("cable_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CABLE_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Length (m)</Label>
              <Input type="number" value={form.length_m ?? ""} onChange={(e) => update("length_m", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Core Color</Label>
              <Select value={form.core_color || ""} onValueChange={(v) => update("core_color", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {CABLE_CORE_COLORS.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full border" style={{ background: c.hex }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Core No.</Label>
              <Input type="number" value={form.core_no ?? ""} onChange={(e) => update("core_no", e.target.value ? Number(e.target.value) : null)} />
            </div>
            <div>
              <Label>Start Point</Label>
              <Input value={form.start_point || ""} onChange={(e) => update("start_point", e.target.value)} placeholder="e.g. ODF Port 4" />
            </div>
            <div>
              <Label>End Point</Label>
              <Input value={form.end_point || ""} onChange={(e) => update("end_point", e.target.value)} placeholder="e.g. TJ Box Port 1" />
            </div>
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea rows={2} value={form.remarks || ""} onChange={(e) => update("remarks", e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {form.id && <Button variant="destructive" onClick={remove}>Delete</Button>}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
