import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface TemplateForm {
  name: string;
  content: string;
  type: string;
  variables: string;
  status: string;
}

const emptyForm: TemplateForm = { name: "", content: "", type: "custom", variables: "", status: "active" };

export default function Templates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [search, setSearch] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["sms_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sms_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: TemplateForm) => {
      if (editId) {
        const { error } = await supabase.from("sms_templates").update(f).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sms_templates").insert(f);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_templates"] });
      toast({ title: editId ? "টেমপ্লেট আপডেট হয়েছে" : "টেমপ্লেট যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_templates"] });
      toast({ title: "টেমপ্লেট মুছে ফেলা হয়েছে" });
    },
  });

  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); };
  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({ name: t.name, content: t.content, type: t.type || "custom", variables: t.variables || "", status: t.status });
    setOpen(true);
  };

  const filtered = templates.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const typeLabel = (t: string) => {
    if (t === "bill_reminder") return "বিল রিমাইন্ডার";
    if (t === "welcome") return "স্বাগতম";
    return "কাস্টম";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">এসএমএস টেমপ্লেট</h1>
          <p className="text-muted-foreground">SMS মেসেজ টেমপ্লেট তৈরি ও পরিচালনা করুন</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />টেমপ্লেট যোগ করুন</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="টেমপ্লেট খুঁজুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>কন্টেন্ট</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো টেমপ্লেট পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{t.content}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabel(t.type || "custom")}</Badge></TableCell>
                    <TableCell><Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "টেমপ্লেট সম্পাদনা" : "নতুন টেমপ্লেট"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>কন্টেন্ট *</Label>
              <Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="প্রিয় {name}, আপনার {month} মাসের বিল {bill} টাকা। বিল পরিশোধ করুন।" />
              <p className="text-xs text-muted-foreground">ভেরিয়েবল: {"{name}"}, {"{client_id}"}, {"{bill}"}, {"{due_date}"}, {"{package}"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>ধরন</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bill_reminder">বিল রিমাইন্ডার</SelectItem>
                    <SelectItem value="welcome">স্বাগতম</SelectItem>
                    <SelectItem value="custom">কাস্টম</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">সক্রিয়</SelectItem><SelectItem value="inactive">নিষ্ক্রিয়</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>ভেরিয়েবল (কমা দিয়ে আলাদা করুন)</Label>
              <Input value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} placeholder="{name}, {bill}, {due_date}" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.content || saveMutation.isPending}>{saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
