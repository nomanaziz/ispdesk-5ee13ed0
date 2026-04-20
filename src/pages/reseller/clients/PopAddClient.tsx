import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getPopScope } from "@/lib/popScope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PopAddClient() {
  const navigate = useNavigate();
  const { customer } = usePortalAuth();
  const { branchId } = getPopScope(customer);
  const [form, setForm] = useState({
    name: "", username: "", password: "", mobile: "", address: "",
    zone_id: "", sub_zone_id: "", box_id: "", package_id: "", monthly_bill: "",
  });

  const { data: zones } = useQuery({
    queryKey: ["pop-zones-add", branchId], enabled: !!branchId,
    queryFn: async () => (await supabase.from("zones").select("id,name").eq("branch_id", branchId!)).data || [],
  });
  const { data: subZones } = useQuery({
    queryKey: ["pop-sub-zones-add", branchId], enabled: !!branchId,
    queryFn: async () => (await supabase.from("sub_zones").select("id,name,zone_id").eq("branch_id", branchId!)).data || [],
  });
  const { data: boxes } = useQuery({
    queryKey: ["pop-boxes-add", branchId], enabled: !!branchId,
    queryFn: async () => (await supabase.from("boxes").select("id,name").eq("branch_id", branchId!)).data || [],
  });
  const { data: packages } = useQuery({
    queryKey: ["pop-packages-add", branchId], enabled: !!branchId,
    queryFn: async () => (await supabase.from("isp_packages").select("id,name,price")).data || [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error("Branch assign করা নেই");
      const payload: any = {
        name: form.name, username: form.username, password: form.password,
        mobile: form.mobile, address: form.address,
        zone_id: form.zone_id || null, sub_zone_id: form.sub_zone_id || null,
        box_id: form.box_id || null, package_id: form.package_id || null,
        monthly_bill: form.monthly_bill ? Number(form.monthly_bill) : 0,
        branch_id: branchId, status: "active",
      };
      const { error } = await supabase.from("clients").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Client added"); navigate("/pop-admin/clients"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!branchId) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">এই POP-এর জন্য branch assign করা নেই</CardContent></Card>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">নতুন Client যোগ করুন</h1>
      <Card>
        <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!form.name || !form.username) { toast.error("Name & PPP ID আবশ্যক"); return; } create.mutate(); }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>PPP ID / Username *</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Mobile</Label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                <SelectContent>{(zones || []).map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sub Zone</Label>
              <Select value={form.sub_zone_id} onValueChange={(v) => setForm({ ...form, sub_zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                <SelectContent>{(subZones || []).filter((s: any) => !form.zone_id || s.zone_id === form.zone_id).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Box</Label>
              <Select value={form.box_id} onValueChange={(v) => setForm({ ...form, box_id: v })}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                <SelectContent>{(boxes || []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Package</Label>
              <Select value={form.package_id} onValueChange={(v) => {
                const p: any = (packages || []).find((x: any) => x.id === v);
                setForm({ ...form, package_id: v, monthly_bill: p?.price ? String(p.price) : form.monthly_bill });
              }}>
                <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
                <SelectContent>{(packages || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} (৳{p.price || 0})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Monthly Bill</Label><Input type="number" value={form.monthly_bill} onChange={(e) => setForm({ ...form, monthly_bill: e.target.value })} /></div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/pop-admin/clients")}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "সংরক্ষণ হচ্ছে..." : "Save Client"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
