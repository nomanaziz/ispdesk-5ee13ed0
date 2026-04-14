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
import { CreditCard, Plus } from "lucide-react";

export default function PgwPayments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reseller_id: "", client_name: "", client_contact: "",
    total_amount: 0, payment_method: "bkash", transaction_id: "",
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["reseller-pgw-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_pgw_payments")
        .select("*, branch_managers(name, tariff_id, reseller_tariffs(selling_rate))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: resellers } = useQuery({
    queryKey: ["resellers-with-tariff"],
    queryFn: async () => {
      const { data } = await supabase
        .from("branch_managers")
        .select("id, name, tariff_id, reseller_tariffs(selling_rate)")
        .eq("status", "active");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const reseller = resellers?.find((r: any) => r.id === form.reseller_id) as any;
      const tariffRate = reseller?.reseller_tariffs?.selling_rate ?? 0;
      const ourShare = tariffRate;
      const resellerShare = form.total_amount - tariffRate;

      const { error } = await supabase.from("reseller_pgw_payments").insert({
        reseller_id: form.reseller_id,
        client_name: form.client_name || null,
        client_contact: form.client_contact || null,
        total_amount: form.total_amount,
        our_share: ourShare,
        reseller_share: resellerShare > 0 ? resellerShare : 0,
        tariff_rate: tariffRate,
        payment_method: form.payment_method,
        transaction_id: form.transaction_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reseller-pgw-payments"] });
      toast.success("পেমেন্ট রেকর্ড হয়েছে");
      setOpen(false);
      setForm({ reseller_id: "", client_name: "", client_contact: "", total_amount: 0, payment_method: "bkash", transaction_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-calc preview
  const selectedReseller = resellers?.find((r: any) => r.id === form.reseller_id) as any;
  const previewTariff = selectedReseller?.reseller_tariffs?.selling_rate ?? 0;
  const previewResellerShare = form.total_amount - previewTariff;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ক্লায়েন্ট PGW পেমেন্ট</h1>
          <p className="text-sm text-muted-foreground">পেমেন্ট গেটওয়ে দিয়ে আসা পেমেন্ট ও অটো স্প্লিট</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> পেমেন্ট যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন PGW পেমেন্ট</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>রিসেলার *</Label>
                <Select value={form.reseller_id} onValueChange={(v) => setForm({ ...form, reseller_id: v })}>
                  <SelectTrigger><SelectValue placeholder="রিসেলার বাছাই করুন" /></SelectTrigger>
                  <SelectContent>
                    {resellers?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ক্লায়েন্ট নাম</Label>
                  <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
                </div>
                <div>
                  <Label>ক্লায়েন্ট মোবাইল</Label>
                  <Input value={form.client_contact} onChange={(e) => setForm({ ...form, client_contact: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>মোট পরিমাণ (৳)</Label>
                <Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>পেমেন্ট মেথড</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="rocket">Rocket</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transaction ID</Label>
                <Input value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} />
              </div>

              {/* Auto-split preview */}
              {form.reseller_id && form.total_amount > 0 && (
                <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                  <div className="flex justify-between"><span>ট্যারিফ রেট:</span> <strong>৳{previewTariff}</strong></div>
                  <div className="flex justify-between"><span>আমাদের শেয়ার:</span> <strong>৳{previewTariff}</strong></div>
                  <div className="flex justify-between"><span>রিসেলার শেয়ার:</span> <strong>৳{previewResellerShare > 0 ? previewResellerShare : 0}</strong></div>
                </div>
              )}

              <Button className="w-full" onClick={() => save.mutate()} disabled={!form.reseller_id || save.isPending}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : "পেমেন্ট রেকর্ড করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> পেমেন্ট তালিকা
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
                    <TableHead>ক্লায়েন্ট</TableHead>
                    <TableHead>মোট (৳)</TableHead>
                    <TableHead>আমাদের (৳)</TableHead>
                    <TableHead>রিসেলার (৳)</TableHead>
                    <TableHead>মেথড</TableHead>
                    <TableHead>তারিখ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((p: any, i) => (
                    <TableRow key={p.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.branch_managers?.name || "-"}</TableCell>
                      <TableCell>{p.client_name || "-"}</TableCell>
                      <TableCell className="font-mono">৳{p.total_amount}</TableCell>
                      <TableCell className="font-mono text-green-600">৳{p.our_share}</TableCell>
                      <TableCell className="font-mono text-blue-600">৳{p.reseller_share}</TableCell>
                      <TableCell><Badge variant="outline">{p.payment_method}</Badge></TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString("bn-BD")}</TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">কোনো পেমেন্ট নেই</TableCell>
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
