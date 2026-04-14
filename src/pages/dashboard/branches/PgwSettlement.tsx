import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Receipt, Plus } from "lucide-react";

export default function PgwSettlement() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reseller_id: "", amount: 0, method: "bank_transfer", reference: "", notes: "" });

  const { data: settlements, isLoading } = useQuery({
    queryKey: ["reseller-pgw-settlements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_pgw_settlements")
        .select("*, branch_managers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: resellers } = useQuery({
    queryKey: ["resellers-select"],
    queryFn: async () => {
      const { data } = await supabase.from("branch_managers").select("id, name, balance").eq("status", "active");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reseller_pgw_settlements").insert({
        reseller_id: form.reseller_id,
        amount: form.amount,
        method: form.method,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reseller-pgw-settlements"] });
      toast.success("সেটেলমেন্ট রেকর্ড হয়েছে");
      setOpen(false);
      setForm({ reseller_id: "", amount: 0, method: "bank_transfer", reference: "", notes: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedReseller = resellers?.find((r) => r.id === form.reseller_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">PGW সেটেলমেন্ট</h1>
          <p className="text-sm text-muted-foreground">রিসেলারদের শেয়ার ফেরত / সেটেলমেন্ট পরিচালনা</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> সেটেলমেন্ট যোগ</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন সেটেলমেন্ট</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>রিসেলার *</Label>
                <Select value={form.reseller_id} onValueChange={(v) => setForm({ ...form, reseller_id: v })}>
                  <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                  <SelectContent>
                    {resellers?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name} (ব্যালেন্স: ৳{r.balance})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedReseller && (
                <div className="bg-muted p-3 rounded text-sm">
                  বর্তমান ব্যালেন্স: <strong>৳{selectedReseller.balance}</strong>
                </div>
              )}
              <div>
                <Label>পরিমাণ (৳)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>মেথড</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">ব্যাংক ট্রান্সফার</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="cash">ক্যাশ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>রেফারেন্স / TrxID</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <Label>নোট</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => save.mutate()} disabled={!form.reseller_id || save.isPending}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সেটেলমেন্ট করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" /> সেটেলমেন্ট তালিকা
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>রিসেলার</TableHead>
                    <TableHead>পরিমাণ (৳)</TableHead>
                    <TableHead>মেথড</TableHead>
                    <TableHead>রেফারেন্স</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead>তারিখ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements?.map((s: any, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.branch_managers?.name || "-"}</TableCell>
                      <TableCell className="font-mono">৳{s.amount}</TableCell>
                      <TableCell>{s.method}</TableCell>
                      <TableCell>{s.reference || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "completed" ? "default" : s.status === "pending" ? "secondary" : "outline"}>
                          {s.status === "pending" ? "পেন্ডিং" : s.status === "completed" ? "সম্পন্ন" : s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    </TableRow>
                  ))}
                  {(!settlements || settlements.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো সেটেলমেন্ট নেই</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
