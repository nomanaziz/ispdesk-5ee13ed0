import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";

interface GroupForm {
  name: string;
  group_type: string;
  description: string;
  members: string;
  status: string;
}

const emptyForm: GroupForm = { name: "", group_type: "manual", description: "", members: "", status: "active" };

export default function Groups() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [search, setSearch] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["sms_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_groups").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: GroupForm) => {
      const membersArray = f.group_type === "manual"
        ? f.members.split("\n").map((m) => m.trim()).filter(Boolean)
        : [];
      const payload = { name: f.name, group_type: f.group_type, description: f.description || null, members: membersArray, status: f.status };
      if (editId) {
        const { error } = await supabase.from("sms_groups").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sms_groups").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_groups"] });
      toast({ title: editId ? "গ্রুপ আপডেট হয়েছে" : "গ্রুপ যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_groups"] });
      toast({ title: "গ্রুপ মুছে ফেলা হয়েছে" });
    },
  });

  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); };
  const openEdit = (g: any) => {
    setEditId(g.id);
    const membersText = Array.isArray(g.members) ? (g.members as string[]).join("\n") : "";
    setForm({ name: g.name, group_type: g.group_type, description: g.description || "", members: membersText, status: g.status });
    setOpen(true);
  };

  const getMemberCount = (g: any) => {
    if (Array.isArray(g.members)) return (g.members as any[]).length;
    return 0;
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { manual: "ম্যানুয়াল", paid_clients: "পেইড ক্লায়েন্ট", unpaid_clients: "আনপেইড ক্লায়েন্ট", due_clients: "বকেয়া ক্লায়েন্ট" };
    return map[t] || t;
  };

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">এসএমএস গ্রুপ</h1>
          <p className="text-muted-foreground">SMS পাঠানোর জন্য ক্লায়েন্ট গ্রুপ তৈরি করুন</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />গ্রুপ যোগ করুন</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="গ্রুপ খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>সদস্য সংখ্যা</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো গ্রুপ পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabel(g.group_type)}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-1"><Users className="h-4 w-4" />{getMemberCount(g)}</div></TableCell>
                    <TableCell><Badge variant={g.status === "active" ? "default" : "secondary"}>{g.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "গ্রুপ সম্পাদনা" : "নতুন গ্রুপ"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>গ্রুপ ধরন</Label>
              <Select value={form.group_type} onValueChange={(v) => setForm({ ...form, group_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">ম্যানুয়াল</SelectItem>
                  <SelectItem value="paid_clients">পেইড ক্লায়েন্ট (অটো)</SelectItem>
                  <SelectItem value="unpaid_clients">আনপেইড ক্লায়েন্ট (অটো)</SelectItem>
                  <SelectItem value="due_clients">বকেয়া ক্লায়েন্ট (অটো)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>বিবরণ</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            {form.group_type === "manual" && (
              <div className="grid gap-2">
                <Label>সদস্য নম্বর (প্রতি লাইনে একটি)</Label>
                <Textarea rows={5} value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} placeholder="01XXXXXXXXX&#10;01XXXXXXXXX" />
              </div>
            )}
            {form.group_type !== "manual" && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">অটো গ্রুপ: SMS পাঠানোর সময় ক্লায়েন্ট তালিকা স্বয়ংক্রিয়ভাবে লোড হবে।</p>
            )}
            <div className="grid gap-2">
              <Label>স্ট্যাটাস</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
