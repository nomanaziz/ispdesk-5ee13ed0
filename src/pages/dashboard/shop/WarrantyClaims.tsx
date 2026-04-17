import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function WarrantyClaims() {
  const [list, setList] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [active, setActive] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [resolution, setResolution] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("warranty_claims")
      .select("*, shop_order_items(name, sku, warranty_start, warranty_end, order_id, shop_orders(order_no, customer_name, mobile))")
      .order("created_at", { ascending: false });
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((c) => statusFilter === "all" || c.status === statusFilter);

  const openDetail = (c: any) => {
    setActive(c); setAdminNote(c.admin_note || ""); setNewStatus(c.status); setResolution(c.resolution_type || "");
  };

  const save = async () => {
    const update: any = { status: newStatus, admin_note: adminNote, resolution_type: resolution || null };
    if (newStatus === "resolved" || newStatus === "rejected") update.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("warranty_claims").update(update).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    toast.success("আপডেট হয়েছে"); setActive(null); load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>ওয়ারেন্টি ক্লেইম</CardTitle>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">সকল</option><option value="received">Received</option>
          <option value="in_progress">In Progress</option><option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>ক্লেইম নং</TableHead><TableHead>তারিখ</TableHead><TableHead>প্রোডাক্ট</TableHead>
            <TableHead>কাস্টমার</TableHead><TableHead>সমস্যা</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.claim_no}</TableCell>
                <TableCell>{new Date(c.received_at).toLocaleDateString()}</TableCell>
                <TableCell>{c.shop_order_items?.name}</TableCell>
                <TableCell>{c.customer_name}<br /><span className="text-xs text-muted-foreground">{c.mobile}</span></TableCell>
                <TableCell className="max-w-xs truncate">{c.issue}</TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => openDetail(c)}>দেখুন</Button></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো ক্লেইম নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ক্লেইম #{active?.claim_no}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div><strong>প্রোডাক্ট:</strong> {active.shop_order_items?.name}</div>
              <div><strong>অর্ডার:</strong> {active.shop_order_items?.shop_orders?.order_no}</div>
              <div><strong>ওয়ারেন্টি:</strong> {active.shop_order_items?.warranty_start} → {active.shop_order_items?.warranty_end}</div>
              <div><strong>সমস্যা:</strong><p className="mt-1 p-2 bg-muted rounded">{active.issue}</p></div>
              <div>
                <Label>স্ট্যাটাস</Label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="received">Received</option><option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option><option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <Label>রেজোলিউশন</Label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="">— নির্বাচন —</option>
                  <option value="repair">Repair</option><option value="replace">Replace</option>
                  <option value="refund">Refund</option><option value="rejected">Rejected</option>
                </select>
              </div>
              <div><Label>অ্যাডমিন নোট</Label><Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} /></div>
              <Button onClick={save} className="w-full">সংরক্ষণ</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
