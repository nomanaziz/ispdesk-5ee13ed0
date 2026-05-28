import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import CashOnHandBanner from "@/components/accounting/CashOnHandBanner";

const TYPES = [
  { v: "owner_capital", l: "মালিকের মূলধন" },
  { v: "partner_capital", l: "অংশীদারের মূলধন" },
  { v: "investor", l: "বিনিয়োগকারী" },
  { v: "bank_loan", l: "ব্যাংক ঋণ" },
  { v: "private_loan", l: "ব্যক্তিগত ঋণ" },
  { v: "other_income", l: "অন্য ব্যবসার আয়" },
];
const CYCLES = [
  { v: "one_time", l: "এককালীন" },
  { v: "monthly", l: "মাসিক" },
  { v: "quarterly", l: "ত্রৈমাসিক" },
  { v: "yearly", l: "বার্ষিক" },
  { v: "flexible", l: "নমনীয়" },
];
const INTEREST = [
  { v: "none", l: "নাই" },
  { v: "flat", l: "Flat" },
  { v: "reducing", l: "Reducing balance" },
  { v: "profit_share", l: "লাভে অংশ" },
];

const defaultForm = {
  type: "owner_capital",
  name: "",
  phone: "",
  address: "",
  identifier: "",
  agreed_amount: 0,
  interest_rate_pct: 0,
  interest_type: "none",
  installment_amount: 0,
  installment_cycle: "one_time",
  total_installments: 0,
  late_fine_rule: { type: "none", value: 0, grace_days: 0 },
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  status: "active",
  notes: "",
};

export default function Contributors() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(defaultForm);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["capital-contributors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("capital_contributors" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        agreed_amount: Number(form.agreed_amount),
        interest_rate_pct: Number(form.interest_rate_pct),
        installment_amount: Number(form.installment_amount),
        total_installments: Number(form.total_installments),
        end_date: form.end_date || null,
      };
      if (editId) {
        const { error } = await supabase.from("capital_contributors" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("capital_contributors" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-contributors"] });
      toast.success(editId ? "আপডেট হয়েছে" : "সংরক্ষিত হয়েছে");
      setOpen(false); setEditId(null); setForm(defaultForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("capital_contributors" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["capital-contributors"] }); toast.success("মুছে ফেলা হয়েছে"); },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      ...defaultForm, ...r,
      late_fine_rule: r.late_fine_rule || defaultForm.late_fine_rule,
      end_date: r.end_date || "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <CashOnHandBanner />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5"/> মূলধন অবদানকারী</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(defaultForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1"/> নতুন</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "সম্পাদনা" : "নতুন অবদানকারী"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>নাম</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></div>
              <div><Label>ফোন</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></div>
              <div><Label>NID / Account / Trade License</Label><Input value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })}/></div>
              <div className="col-span-2"><Label>ঠিকানা</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}/></div>
              <div><Label>Agreed Amount (৳)</Label><Input type="number" value={form.agreed_amount} onChange={e => setForm({ ...form, agreed_amount: e.target.value })}/></div>
              <div><Label>Interest Rate %</Label><Input type="number" value={form.interest_rate_pct} onChange={e => setForm({ ...form, interest_rate_pct: e.target.value })}/></div>
              <div><Label>Interest Type</Label>
                <Select value={form.interest_type} onValueChange={(v) => setForm({ ...form, interest_type: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{INTEREST.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Installment Cycle</Label>
                <Select value={form.installment_cycle} onValueChange={(v) => setForm({ ...form, installment_cycle: v })}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{CYCLES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>মোট কিস্তি</Label><Input type="number" value={form.total_installments} onChange={e => setForm({ ...form, total_installments: e.target.value })}/></div>
              <div><Label>Installment Amount (auto/manual)</Label><Input type="number" value={form.installment_amount} onChange={e => setForm({ ...form, installment_amount: e.target.value })}/></div>
              <div><Label>শুরুর তারিখ</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}/></div>
              <div><Label>শেষ তারিখ</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}/></div>
              <div className="col-span-2 grid grid-cols-3 gap-2 border-t pt-2">
                <div><Label>Late Fine Type</Label>
                  <Select value={form.late_fine_rule.type} onValueChange={(v) => setForm({ ...form, late_fine_rule: { ...form.late_fine_rule, type: v } })}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">নাই</SelectItem>
                      <SelectItem value="fixed">নির্দিষ্ট টাকা</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fine Value</Label><Input type="number" value={form.late_fine_rule.value} onChange={e => setForm({ ...form, late_fine_rule: { ...form.late_fine_rule, value: Number(e.target.value) } })}/></div>
                <div><Label>Grace Days</Label><Input type="number" value={form.late_fine_rule.grace_days} onChange={e => setForm({ ...form, late_fine_rule: { ...form.late_fine_rule, grace_days: Number(e.target.value) } })}/></div>
              </div>
              <div className="col-span-2"><Label>নোট</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>সংরক্ষণ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>নাম</TableHead><TableHead>Type</TableHead><TableHead>Agreed</TableHead>
            <TableHead>Interest</TableHead><TableHead>Cycle</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7}>লোড হচ্ছে…</TableCell></TableRow>}
            {(rows ?? []).map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.name}<div className="text-xs text-muted-foreground">{r.phone}</div></TableCell>
                <TableCell><Badge variant="outline">{TYPES.find(t => t.v === r.type)?.l ?? r.type}</Badge></TableCell>
                <TableCell>৳ {Number(r.agreed_amount).toLocaleString("en-BD")}</TableCell>
                <TableCell>{r.interest_rate_pct}% ({r.interest_type})</TableCell>
                <TableCell>{CYCLES.find(c => c.v === r.installment_cycle)?.l}</TableCell>
                <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4"/></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("মুছবেন?") && del.mutate(r.id)}><Trash2 className="h-4 w-4"/></Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (rows ?? []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">কোনো এন্ট্রি নেই</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
