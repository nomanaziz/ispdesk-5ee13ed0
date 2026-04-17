import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { AlertCircle, Package } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nodeId: string;
  nodeName: string;
}

export function AssignItemsDialog({ open, onOpenChange, nodeId, nodeName }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [itemsRes, assignedRes] = await Promise.all([
      supabase.from("inventory_items").select("id,name,code,quantity").eq("status", "active").order("name"),
      supabase.from("network_node_items").select("id,quantity,inventory_item_id,inventory_items(name,code)").eq("node_id", nodeId),
    ]);
    setItems((itemsRes.data || []).filter((i: any) => (i.quantity ?? 0) > 0));
    setAssigned(assignedRes.data || []);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open, nodeId]);

  const handleAssign = async () => {
    if (!itemId) return;
    const item = items.find((i) => i.id === itemId);
    const qNum = Number(qty);
    if (!item || qNum <= 0) return;
    if (qNum > (item.quantity ?? 0)) { toast.error(`Stock-এ মাত্র ${item.quantity} আছে`); return; }
    setSaving(true);
    try {
      const { error: insErr } = await supabase.from("network_node_items").insert({
        node_id: nodeId, inventory_item_id: itemId, quantity: qNum,
      });
      if (insErr) throw insErr;
      // decrement inventory stock
      await supabase.from("inventory_items").update({ quantity: (item.quantity ?? 0) - qNum }).eq("id", itemId);
      toast.success("Item assigned");
      setItemId(""); setQty("1");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const handleRemove = async (a: any) => {
    try {
      await supabase.from("network_node_items").delete().eq("id", a.id);
      // restore stock
      const { data: inv } = await supabase.from("inventory_items").select("quantity").eq("id", a.inventory_item_id).single();
      if (inv) await supabase.from("inventory_items").update({ quantity: (inv.quantity ?? 0) + Number(a.quantity) }).eq("id", a.inventory_item_id);
      toast.success("Removed");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Items — {nodeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                Inventory-তে কোনো stock নেই। আগে item কিনুন বা inventory-তে যোগ করুন।
                <div className="mt-2">
                  <Link to="/dashboard/inventory/items" className="text-primary underline">Inventory-এ যান</Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
              <div>
                <Label>Item</Label>
                <Select value={itemId} onValueChange={setItemId}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} {i.code ? `(${i.code})` : ""} — Stock: {i.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qty</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <Button onClick={handleAssign} disabled={saving || !itemId}>Add</Button>
            </div>
          )}

          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2"><Package className="h-4 w-4" /> Assigned Items ({assigned.length})</div>
            <div className="border rounded-md divide-y max-h-60 overflow-auto">
              {assigned.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">কোনো item assigned নেই</div>
              ) : assigned.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-2 text-sm">
                  <span>{a.inventory_items?.name} {a.inventory_items?.code ? `(${a.inventory_items.code})` : ""}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Qty: {a.quantity}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(a)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
