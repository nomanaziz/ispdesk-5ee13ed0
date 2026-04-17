import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Item {
  item_name: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  vat_percent: number;
  from_date: string;
  to_date: string;
}

const blank: Item = {
  item_name: "",
  description: "",
  unit: "Mbps",
  quantity: 1,
  rate: 0,
  vat_percent: 0,
  from_date: "",
  to_date: "",
};

const ResellerPurchaseOrderForm = () => {
  const { customer } = usePortalAuth();
  const resellerId = customer?.parent_reseller_id || customer?.sub;
  const navigate = useNavigate();
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [note, setNote] = useState("");
  const [items, setItems] = useState<Item[]>([{ ...blank }]);
  const [saving, setSaving] = useState(false);

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const lineTotal = (it: Item) => {
    const sub = Number(it.quantity) * Number(it.rate);
    return sub + (sub * Number(it.vat_percent || 0)) / 100;
  };
  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);

  const save = async () => {
    if (!resellerId) return;
    if (items.some((it) => !it.item_name.trim())) return toast.error("Item name required for all rows");
    setSaving(true);
    const orderNo = `PO-${Date.now().toString().slice(-8)}`;
    const { data: order, error } = await supabase
      .from("bw_purchase_orders")
      .insert({
        order_no: orderNo,
        reseller_id: resellerId,
        billing_month: billingMonth,
        note,
        total: grandTotal,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !order) {
      setSaving(false);
      return toast.error(error?.message || "Failed to save order");
    }
    const rows = items.map((it) => ({
      order_id: order.id,
      item_name: it.item_name,
      description: it.description,
      unit: it.unit,
      quantity: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
      vat_percent: Number(it.vat_percent) || 0,
      from_date: it.from_date || null,
      to_date: it.to_date || null,
      total: lineTotal(it),
    }));
    const { error: e2 } = await supabase.from("bw_purchase_order_items").insert(rows);
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("Purchase order created");
    navigate("/reseller/purchases");
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/reseller/purchases">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New Purchase Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Billing Month</Label>
              <Input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-24 text-right">Rate</TableHead>
                  <TableHead className="w-20 text-right">VAT %</TableHead>
                  <TableHead className="w-36">From</TableHead>
                  <TableHead className="w-36">To</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell><Input value={it.item_name} onChange={(e) => updateItem(i, { item_name: e.target.value })} /></TableCell>
                    <TableCell><Input value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} /></TableCell>
                    <TableCell><Input value={it.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} /></TableCell>
                    <TableCell><Input type="number" value={it.quantity} onChange={(e) => updateItem(i, { quantity: +e.target.value })} className="text-right" /></TableCell>
                    <TableCell><Input type="number" value={it.rate} onChange={(e) => updateItem(i, { rate: +e.target.value })} className="text-right" /></TableCell>
                    <TableCell><Input type="number" value={it.vat_percent} onChange={(e) => updateItem(i, { vat_percent: +e.target.value })} className="text-right" /></TableCell>
                    <TableCell><Input type="date" value={it.from_date} onChange={(e) => updateItem(i, { from_date: e.target.value })} /></TableCell>
                    <TableCell><Input type="date" value={it.to_date} onChange={(e) => updateItem(i, { to_date: e.target.value })} /></TableCell>
                    <TableCell className="text-right font-medium">৳ {lineTotal(it).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setItems((arr) => arr.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" size="sm" onClick={() => setItems((arr) => [...arr, { ...blank }])}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <Label>Note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Grand Total</div>
              <div className="text-2xl font-bold">৳ {grandTotal.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerPurchaseOrderForm;
