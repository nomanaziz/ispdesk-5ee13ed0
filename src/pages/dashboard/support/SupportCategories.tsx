import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

type Category = {
  id: string;
  name: string;
  department: string | null;
  category_type: string;
  details: string | null;
  status: string;
  created_at: string;
};

const defaultForm = { name: "", department: "", category_type: "for_everyone", details: "" };

export default function SupportCategories() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [tab, setTab] = useState("clients");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["support_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_categories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        department: form.department || null,
        category_type: form.category_type,
        details: form.details || null,
      };
      if (editId) {
        const { error } = await supabase.from("support_categories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("support_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "ক্যাটাগরি আপডেট হয়েছে" : "ক্যাটাগরি যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["support_categories"] });
      closeDialog();
    },
    onError: () => toast.error("সমস্যা হয়েছে"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("support_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ক্যাটাগরি মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["support_categories"] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(defaultForm);
  };

  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ name: cat.name, department: cat.department || "", category_type: cat.category_type, details: cat.details || "" });
    setDialogOpen(true);
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">সাপোর্ট ক্যাটাগরি</h1>
        <Button onClick={() => setDialogOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" />ক্যাটাগরি যোগ করুন</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="clients">Client's</TabsTrigger>
          <TabsTrigger value="pops">POP's</TabsTrigger>
          <TabsTrigger value="bw_pops">Bandwidth POP's</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">ক্যাটাগরি তালিকা</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="সার্চ করুন..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>সাপোর্ট ক্যাটাগরি</TableHead>
                  <TableHead>ডিপার্টমেন্ট</TableHead>
                  <TableHead>ক্যাটাগরি টাইপ</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead className="w-24">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">কোনো ক্যাটাগরি পাওয়া যায়নি</TableCell></TableRow>
                ) : filtered.map((cat, i) => (
                  <TableRow key={cat.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.department || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cat.category_type === "only_office" ? "secondary" : "default"}>
                        {cat.category_type === "only_office" ? "Only For Office" : "For Everyone"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{cat.details || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "ক্যাটাগরি সম্পাদনা" : "নতুন সাপোর্ট ক্যাটাগরি"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ক্যাটাগরি নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ক্যাটাগরি নাম লিখুন" />
            </div>
            <div>
              <Label>ডিপার্টমেন্ট</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="ডিপার্টমেন্ট নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (<SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ক্যাটাগরি টাইপ</Label>
              <Select value={form.category_type} onValueChange={(v) => setForm({ ...form, category_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="for_everyone">For Everyone</SelectItem>
                  <SelectItem value="only_office">Only For Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="বিবরণ লিখুন" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
