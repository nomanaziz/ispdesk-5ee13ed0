import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const MODES = [
  { value: "rickshaw", label: "রিকশা" },
  { value: "bus", label: "বাস" },
  { value: "cng", label: "সিএনজি" },
  { value: "uber", label: "Uber/Pathao" },
  { value: "bike", label: "বাইক" },
  { value: "train", label: "ট্রেন" },
  { value: "walk", label: "হাঁটা" },
  { value: "other", label: "অন্যান্য" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500 hover:bg-amber-600 text-white",
  approved: "bg-green-600 hover:bg-green-700 text-white",
  rejected: "bg-destructive text-destructive-foreground",
};

interface Form {
  bill_date: string;
  from_location: string;
  to_location: string;
  purpose: string;
  transport_mode: string;
  fare_amount: string;
  other_amount: string;
  other_note: string;
  receipt_file: File | null;
}

const EMPTY: Form = {
  bill_date: new Date().toISOString().slice(0, 10),
  from_location: "",
  to_location: "",
  purpose: "",
  transport_mode: "rickshaw",
  fare_amount: "",
  other_amount: "0",
  other_note: "",
  receipt_file: null,
};

export default function MyConveyance() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [empId, setEmpId] = useState<string | null>(null);
  const [empName, setEmpName] = useState<string>("");

  // Find current user's employee record
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.email) return;
      const email = u.user.email.toLowerCase();
      const { data } = await supabase
        .from("employees")
        .select("id,name,email,user_username")
        .or(`email.eq.${email},user_username.eq.${email}`)
        .maybeSingle();
      if (data) {
        setEmpId(data.id);
        setEmpName(data.name);
      }
    })();
  }, []);

  const { data: bills } = useQuery({
    queryKey: ["my-conveyance", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conveyance_bills" as any)
        .select("*")
        .eq("employee_id", empId!)
        .order("bill_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!empId) throw new Error("Employee record না পাওয়া গেছে");
      let receipt_url: string | null = null;
      const { data: u } = await supabase.auth.getUser();
      if (form.receipt_file) {
        const ext = form.receipt_file.name.split(".").pop();
        // Folder must be auth.uid() to satisfy storage RLS (owner-scoped upload)
        const path = `${u.user?.id}/${empId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("conveyance-receipts").upload(path, form.receipt_file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("conveyance-receipts").getPublicUrl(path);
        receipt_url = pub.publicUrl;
      }
      const { error } = await supabase.from("conveyance_bills" as any).insert({
        employee_id: empId,
        bill_date: form.bill_date,
        from_location: form.from_location,
        to_location: form.to_location,
        purpose: form.purpose || null,
        transport_mode: form.transport_mode,
        fare_amount: Number(form.fare_amount) || 0,
        other_amount: Number(form.other_amount) || 0,
        other_note: form.other_note || null,
        receipt_url,
        submitted_by_user: u.user?.id,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-conveyance"] });
      toast.success("বিল জমা হয়েছে");
      setDialog(false);
      setForm(EMPTY);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalApproved = (bills || []).filter((b: any) => b.status === "approved")
    .reduce((s: number, b: any) => s + Number(b.fare_amount || 0) + Number(b.other_amount || 0), 0);
  const totalPending = (bills || []).filter((b: any) => b.status === "pending")
    .reduce((s: number, b: any) => s + Number(b.fare_amount || 0) + Number(b.other_amount || 0), 0);

  if (!empId) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          আপনার login-এর সাথে কোনো employee record লিঙ্ক করা নেই। HR-কে জানান।
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">আমার কনভেয়েন্স বিল</h1>
          <p className="text-sm text-muted-foreground">{empName} — অফিসের কাজে যাতায়াত খরচ এন্ট্রি দিন</p>
        </div>
        <Button onClick={() => setDialog(true)} className="gap-2"><Plus className="h-4 w-4" />নতুন বিল</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">মোট</p><p className="text-xl font-bold">{(bills || []).length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">অনুমোদিত</p><p className="text-xl font-bold text-green-600">৳{totalApproved.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">পেন্ডিং</p><p className="text-xl font-bold text-amber-600">৳{totalPending.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">আমার বিল তালিকা</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>তারিখ</TableHead>
                <TableHead>রুট</TableHead>
                <TableHead>মোড</TableHead>
                <TableHead className="text-right">মোট</TableHead>
                <TableHead>স্ট্যাটাস</TableHead>
                <TableHead>মন্তব্য</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bills || []).map((b: any) => {
                const total = Number(b.fare_amount || 0) + Number(b.other_amount || 0);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs">{b.bill_date}</TableCell>
                    <TableCell className="text-xs">{b.from_location} → {b.to_location}{b.purpose && <div className="text-muted-foreground">{b.purpose}</div>}</TableCell>
                    <TableCell className="text-xs">{b.transport_mode}</TableCell>
                    <TableCell className="text-right">৳{total.toLocaleString()}</TableCell>
                    <TableCell><Badge className={STATUS_BADGE[b.status]}>{b.status}</Badge></TableCell>
                    <TableCell className="text-xs">{b.review_remark || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {(bills || []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">কোনো বিল নেই</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>নতুন কনভেয়েন্স বিল</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>তারিখ *</Label>
              <Input type="date" value={form.bill_date} onChange={(e) => setForm({ ...form, bill_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>কোথা থেকে *</Label>
                <Input value={form.from_location} onChange={(e) => setForm({ ...form, from_location: e.target.value })} placeholder="যেমন: অফিস" />
              </div>
              <div>
                <Label>কোথায় *</Label>
                <Input value={form.to_location} onChange={(e) => setForm({ ...form, to_location: e.target.value })} placeholder="যেমন: কাকরাইল" />
              </div>
            </div>
            <div>
              <Label>উদ্দেশ্য</Label>
              <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="কোন কাজে" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>যাতায়াত *</Label>
                <Select value={form.transport_mode} onValueChange={(v) => setForm({ ...form, transport_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>ভাড়া (৳) *</Label>
                <Input type="number" value={form.fare_amount} onChange={(e) => setForm({ ...form, fare_amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>অন্যান্য খরচ (৳)</Label>
                <Input type="number" value={form.other_amount} onChange={(e) => setForm({ ...form, other_amount: e.target.value })} />
              </div>
              <div>
                <Label>অন্যান্য নোট</Label>
                <Input value={form.other_note} onChange={(e) => setForm({ ...form, other_note: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>রসিদ (ঐচ্ছিক)</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setForm({ ...form, receipt_file: e.target.files?.[0] || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>বাতিল</Button>
            <Button onClick={() => submit.mutate()} disabled={!form.from_location || !form.to_location || !form.fare_amount || submit.isPending}>জমা দিন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
