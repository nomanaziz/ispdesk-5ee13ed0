import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function ShopCoupons() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "fixed", value: 0, min_order: 0, expires_at: "", usage_limit: "", status: "active" });

  const load = async () => {
    const { data } = await supabase.from("shop_coupons").select("*").order("created_at", { ascending: false });
    setList((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const { error } = await supabase.from("shop_coupons").insert({
      ...form, value: +form.value, min_order: +form.min_order,
      usage_limit: form.usage_limit ? +form.usage_limit : null,
      expires_at: form.expires_at || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("সংরক্ষিত হয়েছে"); setOpen(false); load();
  };

  const del = async (id: string) => {
    if (!confirm("ডিলিট?")) return;
    await supabase.from("shop_coupons").delete().eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>কুপন</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />নতুন</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন কুপন</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>কোড</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
              <div>
                <Label>টাইপ</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="fixed">ফিক্সড (BDT)</option><option value="percent">পার্সেন্ট (%)</option>
                </select>
              </div>
              <div><Label>ভ্যালু</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} /></div>
              <div><Label>মিনিমাম অর্ডার</Label><Input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: +e.target.value })} /></div>
              <div><Label>মেয়াদ শেষ</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              <div><Label>ব্যবহার লিমিট</Label><Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} /></div>
              <Button onClick={save} className="w-full">সংরক্ষণ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>কোড</TableHead><TableHead>টাইপ</TableHead><TableHead>ভ্যালু</TableHead><TableHead>মিন অর্ডার</TableHead><TableHead>ব্যবহৃত</TableHead><TableHead>স্ট্যাটাস</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell>{c.type}</TableCell>
                <TableCell>{c.type === "percent" ? `${c.value}%` : `৳${c.value}`}</TableCell>
                <TableCell>৳{c.min_order}</TableCell>
                <TableCell>{c.used}/{c.usage_limit || "∞"}</TableCell>
                <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {list.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো কুপন নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
