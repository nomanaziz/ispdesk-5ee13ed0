import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NODE_KIND_LIST, NODE_STYLES, type NodeKind } from "./nodeStyles";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  parentId: string | null;
  defaultKind?: NodeKind;
  onCreated: () => void;
}

export function AddNodeDialog({ open, onOpenChange, parentId, defaultKind = "custom", onCreated }: Props) {
  const [name, setName] = useState("");
  const [nodeType, setNodeType] = useState<NodeKind>(defaultKind);
  const [splitterPreset, setSplitterPreset] = useState<string>("none");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setNodeType(defaultKind); }, [open, defaultKind]);

  const reset = () => {
    setName(""); setNodeType("custom"); setSplitterPreset("none"); setRemarks("");
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name দিন"); return; }
    setSaving(true);
    try {
      const s = NODE_STYLES[nodeType];
      const { data: parent, error } = await supabase
        .from("network_nodes")
        .insert({
          name: name.trim(),
          node_type: nodeType,
          parent_id: parentId,
          remarks: remarks || null,
          color: s.color,
          icon: nodeType,
        })
        .select()
        .single();
      if (error) throw error;

      if (nodeType === "splitter_main" && splitterPreset !== "none" && parent) {
        const presets: Record<string, { count: number; childKind: NodeKind; childName: string }> = {
          "epon-1-8":   { count: 8,   childKind: "splitter_sub", childName: "Sub Splitter" },
          "gpon-1-2":   { count: 2,   childKind: "splitter_sub", childName: "Sub Splitter" },
          "gpon-1-64":  { count: 64,  childKind: "onu",          childName: "ONU" },
          "gpon-1-128": { count: 128, childKind: "onu",          childName: "ONU" },
        };
        const p = presets[splitterPreset];
        if (p) {
          const cs = NODE_STYLES[p.childKind];
          const rows = Array.from({ length: p.count }).map((_, i) => ({
            name: `${p.childName} ${i + 1}`,
            node_type: p.childKind,
            parent_id: parent.id,
            color: cs.color,
            icon: p.childKind,
          }));
          await supabase.from("network_nodes").insert(rows);
        }
      }

      toast.success("Node তৈরি হয়েছে");
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parentId ? "Child Node যোগ করুন" : "Root Node তৈরি করুন"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CORE-RTR-01" />
          </div>
          <div>
            <Label>Entity Type</Label>
            <Select value={nodeType} onValueChange={(v) => setNodeType(v as NodeKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NODE_KIND_LIST.map((k) => (
                  <SelectItem key={k} value={k}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: NODE_STYLES[k].color }} />
                      {NODE_STYLES[k].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {nodeType === "splitter_main" && (
            <div>
              <Label>Splitter Preset (auto-create children)</Label>
              <Select value={splitterPreset} onValueChange={setSplitterPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (manual)</SelectItem>
                  <SelectItem value="epon-1-8">EPON 1:8 (8 sub splitters)</SelectItem>
                  <SelectItem value="gpon-1-2">GPON 1:2</SelectItem>
                  <SelectItem value="gpon-1-64">GPON 1:64 (64 ONUs)</SelectItem>
                  <SelectItem value="gpon-1-128">GPON 1:128 (128 ONUs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Backward-compat re-exports for old imports
export type NodeTypeOption = NodeKind;
