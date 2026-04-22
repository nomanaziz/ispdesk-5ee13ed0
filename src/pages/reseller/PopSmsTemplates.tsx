import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPortal } from "@/lib/portalApi";
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
import { toast } from "sonner";
import { Pencil, Plus, Search, RotateCcw, ShieldCheck, ShieldAlert, Trash2, User } from "lucide-react";
import { TEMPLATE_CATEGORIES, categoryLabel } from "@/lib/templateVars";
import VariableChips from "@/components/sms/VariableChips";

interface EffectiveTpl {
  master_id: string;
  template_key: string;
  name: string;
  content: string;
  template_type: string;
  category: string;
  variables: string[];
  is_protected: boolean;
  is_active: boolean;
  is_overridden: boolean;
  is_own?: boolean;
  created_by_branch?: string | null;
}

type Mode = "override" | "create" | "edit_own";

interface FormState {
  name: string;
  content: string;
  category: string;
  is_active: boolean;
}

const emptyForm: FormState = { name: "", content: "", category: "general", is_active: true };

export default function PopSmsTemplates() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [editing, setEditing] = useState<EffectiveTpl | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["pop_sms_templates"],
    queryFn: async () => {
      const r = await callPortal<{ templates: EffectiveTpl[] }>("pop_list_templates");
      return r.templates || [];
    },
  });

  const closeDialog = () => {
    setMode(null);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        await callPortal("pop_create_template", form);
      } else if (mode === "edit_own" && editing) {
        await callPortal("pop_update_own_template", {
          master_id: editing.master_id,
          ...form,
        });
      } else if (mode === "override" && editing) {
        await callPortal("pop_save_template_override", {
          master_id: editing.master_id,
          name: form.name,
          content: form.content,
          is_active: form.is_active,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pop_sms_templates"] });
      toast.success(mode === "create" ? "নতুন টেমপ্লেট তৈরি হয়েছে" : "টেমপ্লেট সংরক্ষিত হয়েছে");
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: async (master_id: string) => {
      await callPortal("pop_reset_template", { master_id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pop_sms_templates"] });
      toast.success("ডিফল্টে রিসেট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (master_id: string) => {
      await callPortal("pop_delete_template", { master_id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pop_sms_templates"] });
      toast.success("টেমপ্লেট ডিলিট হয়েছে");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMode("create");
  };

  const openEdit = (t: EffectiveTpl) => {
    setEditing(t);
    setForm({
      name: t.name,
      content: t.content,
      category: t.category || "general",
      is_active: t.is_active,
    });
    // own custom → full edit; otherwise just override (name/content/active)
    setMode(t.is_own ? "edit_own" : "override");
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
            সিস্টেম ডিফল্ট + আপনার নিজস্ব টেমপ্লেট। ডিফল্ট edit করলে আপনার একটা override কপি হবে।
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> নতুন টেমপ্লেট
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
                    <TableRow key={t.master_id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          {t.name}
                          {t.is_protected && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <ShieldCheck className="h-3 w-3" /> ডিফল্ট
                            </Badge>
                          )}
                          {t.is_own && (
                            <Badge className="gap-1 text-xs">
                              <User className="h-3 w-3" /> নিজস্ব
                            </Badge>
                          )}
                          {t.is_overridden && !t.is_own && (
                            <Badge className="gap-1 text-xs">
                              <ShieldAlert className="h-3 w-3" /> কাস্টমাইজড
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabel(t.category)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-sm text-muted-foreground">
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
                          {t.is_overridden && !t.is_own && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="ডিফল্টে রিসেট"
                              onClick={() => resetMut.mutate(t.master_id)}
                            >
                              <RotateCcw className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {t.is_own && !t.is_protected && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="ডিলিট"
                              onClick={() => {
                                if (confirm("নিশ্চিত করুন: এই টেমপ্লেট ডিলিট করতে চান?")) {
                                  deleteMut.mutate(t.master_id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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

      <Dialog open={!!mode} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? "নতুন কাস্টম টেমপ্লেট"
                : mode === "edit_own"
                  ? `নিজস্ব টেমপ্লেট এডিট — ${editing?.name}`
                  : `টেমপ্লেট কাস্টমাইজ — ${editing?.name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>কন্টেন্ট *</Label>
              <Textarea
                ref={contentRef}
                rows={5}
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
            {(mode === "create" || mode === "edit_own") && (
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
            )}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>সক্রিয়</Label>
                <p className="text-xs text-muted-foreground">নিষ্ক্রিয় হলে এই POP-এ দেখাবে না</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>বাতিল</Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={!form.name || !form.content || saveMut.isPending}
            >
              {saveMut.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
