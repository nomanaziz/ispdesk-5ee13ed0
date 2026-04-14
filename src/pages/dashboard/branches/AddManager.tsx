import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AddManager() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", contact: "", nid_number: "", address: "",
    client_code: "", client_code_prefix: "", use_prefix: false,
    min_recharge: 0, tariff_id: "", branch_id: "",
  });

  const { data: tariffs } = useQuery({
    queryKey: ["reseller-tariffs-select"],
    queryFn: async () => {
      const { data } = await supabase.from("reseller_tariffs").select("id, name").eq("status", "active");
      return data ?? [];
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
      const { error } = await supabase.from("branch_managers").insert({
        name: form.name,
        email: form.email || null,
        contact: form.contact || null,
        nid_number: form.nid_number || null,
        address: form.address || null,
        client_code: form.client_code || null,
        client_code_prefix: form.client_code_prefix || null,
        use_prefix: form.use_prefix,
        min_recharge: form.min_recharge,
        tariff_id: form.tariff_id || null,
        branch_id: form.branch_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      toast.success("POP ম্যানেজার যোগ হয়েছে");
      navigate("/dashboard/branches/managers");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">POP যোগ করুন</h1>
        <p className="text-sm text-muted-foreground">নতুন রিসেলার / POP ম্যানেজার তৈরি করুন</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> রিসেলার তথ্য
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="রিসেলারের নাম" />
            </div>
            <div>
              <Label>ইমেইল</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>মোবাইল নম্বর</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div>
              <Label>NID নম্বর</Label>
              <Input value={form.nid_number} onChange={(e) => setForm({ ...form, nid_number: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>ঠিকানা</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>ক্লায়েন্ট কোড</Label>
              <Input value={form.client_code} onChange={(e) => setForm({ ...form, client_code: e.target.value })} placeholder="e.g. RES001" />
            </div>
            <div>
              <Label>কোড প্রিফিক্স</Label>
              <Input value={form.client_code_prefix} onChange={(e) => setForm({ ...form, client_code_prefix: e.target.value })} placeholder="e.g. XYZ-" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.use_prefix} onCheckedChange={(v) => setForm({ ...form, use_prefix: v })} />
            <Label>ক্লায়েন্ট আইডিতে প্রিফিক্স ব্যবহার করুন</Label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>মিনিমাম রিচার্জ (৳)</Label>
              <Input type="number" value={form.min_recharge} onChange={(e) => setForm({ ...form, min_recharge: Number(e.target.value) })} />
            </div>
            <div>
              <Label>ট্যারিফ অ্যাসাইন</Label>
              <Select value={form.tariff_id} onValueChange={(v) => setForm({ ...form, tariff_id: v })}>
                <SelectTrigger><SelectValue placeholder="ট্যারিফ বাছাই করুন" /></SelectTrigger>
                <SelectContent>
                  {tariffs?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>POP / ব্রাঞ্চ</Label>
            <Select value={form.branch_id} onValueChange={(v) => setForm({ ...form, branch_id: v })}>
              <SelectTrigger><SelectValue placeholder="POP বাছাই করুন" /></SelectTrigger>
              <SelectContent>
                {branches?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={() => save.mutate()} disabled={!form.name || save.isPending}>
            {save.isPending ? "সংরক্ষণ হচ্ছে..." : "রিসেলার যোগ করুন"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
