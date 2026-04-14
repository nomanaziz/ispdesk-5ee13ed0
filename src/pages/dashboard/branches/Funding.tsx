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
import { Banknote, Plus } from "lucide-react";

export default function Funding() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ branch_id: "", amount: 0, type: "credit", description: "" });

  const { data: fundings, isLoading } = useQuery({
    queryKey: ["branch-funding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branch_funding")
        .select("*, branches(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches-select"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("branch_funding").insert({
        branch_id: form.branch_id || null,
        amount: form.amount,
        type: form.type,
        description: form.description || null,
        funding_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-funding"] });
      toast.success("ফান্ড যোগ হয়েছে");
      setOpen(false);
      setForm({ branch_id: "", amount: 0, type: "credit", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">রিসেলার ফান্ডিং</h1>
          <p className="text-sm text-muted-foreground">রিসেলারদের ফান্ড যোগ ও হিস্ট্রি দেখুন</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> ফান্ড যোগ করুন</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>নতুন ফান্ড</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>POP / ব্রাঞ্চ</Label>
                <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
                  <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                  <SelectContent>
                    {branches?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>পরিমাণ (৳)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>টাইপ</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">ক্রেডিট (জমা)</SelectItem>
                    <SelectItem value="debit">ডেবিট (খরচ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>বিবরণ</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" /> ফান্ডিং হিস্ট্রি
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
                    <TableHead>POP</TableHead>
                    <TableHead>পরিমাণ (৳)</TableHead>
                    <TableHead>টাইপ</TableHead>
                    <TableHead>বিবরণ</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundings?.map((f: any, i) => (
                    <TableRow key={f.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{f.branches?.name || "-"}</TableCell>
                      <TableCell className="font-mono">৳{f.amount}</TableCell>
                      <TableCell>
                        <Badge variant={f.type === "credit" ? "default" : "secondary"}>
                          {f.type === "credit" ? "জমা" : "খরচ"}
                        </Badge>
                      </TableCell>
                      <TableCell>{f.description || "-"}</TableCell>
                      <TableCell>{f.funding_date ? new Date(f.funding_date).toLocaleDateString("bn-BD") : "-"}</TableCell>
                      <TableCell><Badge variant="outline">{f.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!fundings || fundings.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">কোনো ফান্ডিং নেই</TableCell>
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
