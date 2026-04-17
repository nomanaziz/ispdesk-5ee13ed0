import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NodeTypeOption =
  | "pop" | "olt" | "splitter_main" | "splitter_sub" | "switch" | "router" | "onu" | "client" | "custom";

const NODE_TYPE_LABELS: Record<NodeTypeOption, string> = {
  pop: "POP", olt: "OLT", splitter_main: "Main Splitter", splitter_sub: "Sub Splitter",
  switch: "Switch", router: "Router", onu: "ONU", client: "Client", custom: "Custom",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  parentId: string | null;
  onCreated: () => void;
}

export function AddNodeDialog({ open, onOpenChange, parentId, onCreated }: Props) {
  const [name, setName] = useState("");
  const [nodeType, setNodeType] = useState<NodeTypeOption>("custom");
  const [splitterPreset, setSplitterPreset] = useState<string>("none");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(""); setNodeType("custom"); setSplitterPreset("none"); setRemarks("");
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name দিন"); return; }
    setSaving(true);
    try {
      const { data: parent, error } = await supabase
        .from("network_nodes")
        .insert({ name: name.trim(), node_type: nodeType, parent_id: parentId, remarks: remarks || null })
        .select()
        .single();
      if (error) throw error;

      // EPON/GPON splitter presets — auto-create children
      if (nodeType === "splitter_main" && splitterPreset !== "none" && parent) {
        const presets: Record<string, { count: number; childType: NodeTypeOption; childName: string }> = {
          "epon-1-8": { count: 8, childType: "splitter_sub", childName: "Sub Splitter" },
          "gpon-1-2": { count: 2, childType: "splitter_sub", childName: "Sub Splitter" },
          "gpon-1-64": { count: 64, childType: "onu", childName: "ONU" },
          "gpon-1-128": { count: 128, childType: "onu", childName: "ONU" },
        };
        const p = presets[splitterPreset];
        if (p) {
          const rows = Array.from({ length: p.count }).map((_, i) => ({
            name: `${p.childName} ${i + 1}`,
            node_type: p.childType,
            parent_id: parent.id,
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
            <Label>Node Type</Label>
            <Select value={nodeType} onValueChange={(v) => setNodeType(v as NodeTypeOption)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(NODE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
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
