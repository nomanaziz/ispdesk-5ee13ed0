import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, ShieldCheck } from "lucide-react";
import { TEMPLATE_CATEGORIES, categoryLabel } from "@/lib/templateVars";
import VariableChips from "@/components/sms/VariableChips";

interface MasterRow {
  id: string;
  template_key: string;
  name: string;
  content: string;
  template_type: string;
  category: string;
  variables: string[];
  is_protected: boolean;
  is_active: boolean;
}

interface Form {
  template_key: string;
  name: string;
  content: string;
  category: string;
  is_active: boolean;
}

const emptyForm: Form = {
  template_key: "",
  name: "",
  content: "",
  category: "general",
  is_active: true,
};

export default function Templates() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [search, setSearch] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["sms_template_master"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_template_master")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as MasterRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: Form) => {
      const variables = Array.from(
        new Set(Array.from(f.content.matchAll(/\{(\w+)\}/g)).map((m) => m[1])),
      );
      const payload = {
        template_key: f.template_key || `custom_${Date.now()}`,
        name: f.name,
        content: f.content,
        category: f.category,
        variables,
        is_active: f.is_active,
        template_type: "custom",
      };
      if (editId) {
        const { error } = await supabase
          .from("sms_template_master")
          .update({
            name: payload.name,
            content: payload.content,
            category: payload.category,
            variables,
            is_active: payload.is_active,
          })
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sms_template_master").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_template_master"] });
      toast({ title: editId ? "টেমপ্লেট আপডেট হয়েছে" : "টেমপ্লেট যোগ হয়েছে" });
      closeDialog();
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sms_template_master").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms_template_master"] });
      toast({ title: "টেমপ্লেট মুছে ফেলা হয়েছে" });
    },
    onError: (e: any) =>
      toast({ title: "ডিলিট ব্যর্থ", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (t: MasterRow) => {
    setEditId(t.id);
    setForm({
      template_key: t.template_key,
      name: t.name,
      content: t.content,
      category: t.category,
      is_active: t.is_active,
    });
    setOpen(true);
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.template_key.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">এসএমএস টেমপ্লেট</h1>
          <p className="text-muted-foreground">
            সিস্টেম-ব্যাপী ডিফল্ট ও কাস্টম SMS টেমপ্লেট ব্যবস্থাপনা — সব POP/Admin-এ অটো লোড হয়
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setEditId(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          টেমপ্লেট যোগ করুন
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="টেমপ্লেট খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ক্যাটাগরি</TableHead>
                  <TableHead>কন্টেন্ট</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  <TableHead>অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">লোড হচ্ছে...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">কোনো টেমপ্লেট পাওয়া যায়নি</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {t.name}
                          {t.is_protected && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <ShieldCheck className="h-3 w-3" /> ডিফল্ট
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{t.template_key}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabel(t.category)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {t.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t.template_type === "default" ? "ডিফল্ট" : "কাস্টম"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "default" : "secondary"}>
                          {t.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={t.is_protected}
                            title={t.is_protected ? "ডিফল্ট টেমপ্লেট ডিলিট করা যাবে না" : "ডিলিট"}
                            onClick={() => deleteMutation.mutate(t.id)}
                          >
                            <Trash2
                              className={
                                t.is_protected ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-destructive"
                              }
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "টেমপ্লেট সম্পাদনা" : "নতুন টেমপ্লেট"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editId && (
              <div className="grid gap-2">
                <Label>Template Key (ইউনিক)</Label>
                <Input
                  value={form.template_key}
                  onChange={(e) =>
                    setForm({ ...form, template_key: e.target.value.replace(/\s+/g, "_").toLowerCase() })
                  }
                  placeholder="auto-generate করতে খালি রাখুন"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>কন্টেন্ট *</Label>
              <Textarea
                ref={contentRef}
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="প্রিয় {UserName}, আপনার {Month} মাসের বিল {MonthlyBillAmount} টাকা।"
              />
              <VariableChips
                textareaRef={contentRef}
                value={form.content}
                onChange={(v) => setForm({ ...form, content: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>ক্যাটাগরি</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>স্ট্যাটাস</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <span className="text-sm">{form.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name || !form.content || saveMutation.isPending}
            >
              {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
