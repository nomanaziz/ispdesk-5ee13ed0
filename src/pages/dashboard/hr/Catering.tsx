import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const DAYS = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র"];

export default function Catering() {
  const qc = useQueryClient();
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcOwner, setSvcOwner] = useState("");
  const [svcPhone, setSvcPhone] = useState("");
  const [svcEmail, setSvcEmail] = useState("");
  const [svcAddress, setSvcAddress] = useState("");
  const [svcPrice, setSvcPrice] = useState("120");
  const [editingMenu, setEditingMenu] = useState<{ serviceId: string; day: number } | null>(null);
  const [items, setItems] = useState("");
  const [price, setPrice] = useState("0");

  const { data: services } = useQuery({
    queryKey: ["catering-services-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("catering_services" as any).select("*").order("name");
      return (data as any[]) ?? [];
    },
  });

  const { data: menus } = useQuery({
    queryKey: ["catering-menus-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("catering_weekly_menu" as any).select("*");
      return (data as any[]) ?? [];
    },
  });

  const addService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("catering_services" as any).insert({ name: svcName, contact: svcContact || null });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service যোগ হয়েছে"); setSvcOpen(false); setSvcName(""); setSvcContact(""); qc.invalidateQueries({ queryKey: ["catering-services-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const upsertMenu = useMutation({
    mutationFn: async () => {
      if (!editingMenu) return;
      const itemsArr = items.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const existing = (menus ?? []).find((m: any) => m.service_id === editingMenu.serviceId && m.day_of_week === editingMenu.day);
      if (existing) {
        const { error } = await supabase.from("catering_weekly_menu" as any).update({ items: itemsArr, price: Number(price) }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catering_weekly_menu" as any).insert({
          service_id: editingMenu.serviceId, day_of_week: editingMenu.day, items: itemsArr, price: Number(price),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Menu সংরক্ষণ হয়েছে"); setEditingMenu(null); qc.invalidateQueries({ queryKey: ["catering-menus-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openMenuEditor = (serviceId: string, day: number) => {
    const existing = (menus ?? []).find((m: any) => m.service_id === serviceId && m.day_of_week === day);
    setItems(existing ? (existing.items as any[]).map((i: any) => typeof i === "string" ? i : i.name).join(", ") : "");
    setPrice(existing ? String(existing.price) : "0");
    setEditingMenu({ serviceId, day });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Catering Services</CardTitle>
          <Button onClick={() => setSvcOpen(true)}><Plus className="h-4 w-4 mr-1" /> নতুন service</Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {(services ?? []).map((s: any) => (
            <div key={s.id} className="border rounded p-3 space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.contact || "—"}</p>
                </div>
                <Badge variant={s.active ? "default" : "outline"}>{s.active ? "Active" : "Inactive"}</Badge>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-20">দিন</TableHead><TableHead>Menu</TableHead><TableHead className="text-right">মূল্য</TableHead><TableHead className="w-24"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {DAYS.map((dn, idx) => {
                    const m = (menus ?? []).find((mm: any) => mm.service_id === s.id && mm.day_of_week === idx);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{dn}</TableCell>
                        <TableCell className="text-xs">{m ? (m.items as any[]).map((i: any) => typeof i === "string" ? i : i.name).join(", ") : <span className="text-muted-foreground">সেট নেই</span>}</TableCell>
                        <TableCell className="text-right">{m ? `৳${Number(m.price).toLocaleString()}` : "—"}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => openMenuEditor(s.id, idx)}>সম্পাদনা</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
          {(services ?? []).length === 0 && <p className="text-muted-foreground text-sm text-center py-8">কোনো catering service নেই</p>}
        </CardContent>
      </Card>

      <Dialog open={svcOpen} onOpenChange={setSvcOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন Catering Service</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>নাম *</Label><Input value={svcName} onChange={(e) => setSvcName(e.target.value)} /></div>
            <div><Label>যোগাযোগ</Label><Input value={svcContact} onChange={(e) => setSvcContact(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSvcOpen(false)}>বাতিল</Button>
            <Button onClick={() => addService.mutate()} disabled={!svcName || addService.isPending}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMenu} onOpenChange={(o) => !o && setEditingMenu(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Menu — {editingMenu && DAYS[editingMenu.day]}বার</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>আইটেম (কমা বা নতুন লাইন দিয়ে আলাদা করুন)</Label>
              <Textarea value={items} onChange={(e) => setItems(e.target.value)} rows={4} placeholder="ভাত, মাছ, ডাল, ভর্তা" />
            </div>
            <div><Label>মূল্য (৳)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMenu(null)}>বাতিল</Button>
            <Button onClick={() => upsertMenu.mutate()} disabled={upsertMenu.isPending}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
