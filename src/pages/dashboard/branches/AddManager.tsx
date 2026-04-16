import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UserPlus, Building2, ShieldCheck, ImagePlus } from "lucide-react";
import PermissionTreeSelector from "@/components/branches/PermissionTreeSelector";
import { buildDefaultPermissions } from "@/lib/popPermissions";

export default function AddManager() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [permissions, setPermissions] = useState<Record<string, boolean>>(buildDefaultPermissions());
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    // Personal
    name: "",
    email: "",
    contact: "",
    phone: "",
    national_id: "",
    district_id: "",
    upazila_id: "",
    zone_id: "",
    pop_code: "",
    pop_prefix: "",
    set_prefix_mikrotik: false,
    pop_type: "prepaid" as "prepaid" | "postpaid",
    min_recharge: 0,
    address: "",
    // Business
    company_name: "",
    tariff_id: "",
    branch_id: "",
    disable_clients: true,
    min_balance: 0,
    // Login
    username: "",
    password: "",
    confirm_password: "",
  });

  const upd = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

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
  const { data: districts } = useQuery({
    queryKey: ["districts-select"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id, name").order("name");
      return data ?? [];
    },
  });
  const { data: upazilas } = useQuery({
    queryKey: ["upazilas-select", form.district_id],
    enabled: !!form.district_id,
    queryFn: async () => {
      const { data } = await supabase.from("upazilas").select("id, name").eq("district_id", form.district_id).order("name");
      return data ?? [];
    },
  });
  const { data: zones } = useQuery({
    queryKey: ["zones-select"],
    queryFn: async () => {
      const { data } = await supabase.from("zones").select("id, name").order("name");
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name) throw new Error("নাম আবশ্যক");
      if (!form.username) throw new Error("ইউজারনেম আবশ্যক");
      if (!form.password) throw new Error("পাসওয়ার্ড আবশ্যক");
      if (form.password !== form.confirm_password) throw new Error("পাসওয়ার্ড মেলেনি");

      let logo_url: string | null = null;
      if (logoFile) {
        const path = `pop/${Date.now()}-${logoFile.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await supabase.storage.from("pop-logos").upload(path, logoFile, { upsert: false });
        if (upErr) throw upErr;
        logo_url = supabase.storage.from("pop-logos").getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from("branch_managers").insert({
        name: form.name,
        email: form.email || null,
        contact: form.contact || null,
        phone: form.phone || null,
        national_id: form.national_id || null,
        nid_number: form.national_id || null,
        district_id: form.district_id || null,
        upazila_id: form.upazila_id || null,
        zone_id: form.zone_id || null,
        pop_code: form.pop_code || null,
        pop_prefix: form.pop_prefix || null,
        set_prefix_mikrotik: form.set_prefix_mikrotik,
        pop_type: form.pop_type,
        min_recharge: form.min_recharge,
        address: form.address || null,
        company_name: form.company_name || null,
        tariff_id: form.tariff_id || null,
        branch_id: form.branch_id || null,
        disable_clients: form.disable_clients,
        min_balance: form.min_balance,
        username: form.username,
        password: form.password,
        permissions,
        portal_enabled: true,
        logo_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      toast.success("POP যোগ হয়েছে");
      navigate("/dashboard/branches/managers");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">POP যোগ করুন</h1>
        <p className="text-sm text-muted-foreground">নতুন POP / Branch Manager — ব্যক্তিগত তথ্য, ব্যবসা ও পারমিশন</p>
      </div>

      {/* Card 1 — Personal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> ব্যক্তিগত তথ্য
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Contact Person Name *</Label>
            <Input value={form.name} onChange={(e) => upd("name", e.target.value)} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} />
          </div>
          <div>
            <Label>Mobile *</Label>
            <Input value={form.contact} onChange={(e) => upd("contact", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => upd("phone", e.target.value)} />
          </div>
          <div>
            <Label>National ID</Label>
            <Input value={form.national_id} onChange={(e) => upd("national_id", e.target.value)} />
          </div>
          <div>
            <Label>District</Label>
            <Select value={form.district_id} onValueChange={(v) => { upd("district_id", v); upd("upazila_id", ""); }}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
              <SelectContent>{districts?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Upazila</Label>
            <Select value={form.upazila_id} onValueChange={(v) => upd("upazila_id", v)} disabled={!form.district_id}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
              <SelectContent>{upazilas?.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Zone</Label>
            <Select value={form.zone_id} onValueChange={(v) => upd("zone_id", v)}>
              <SelectTrigger><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
              <SelectContent>{zones?.map((z: any) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>POP Code (auto)</Label>
            <Input value={form.pop_code} onChange={(e) => upd("pop_code", e.target.value)} placeholder="খালি রাখলে অটো 0001" />
          </div>
          <div>
            <Label>POP Prefix</Label>
            <Input value={form.pop_prefix} onChange={(e) => upd("pop_prefix", e.target.value)} placeholder="e.g. AB1" />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.set_prefix_mikrotik} onCheckedChange={(v) => upd("set_prefix_mikrotik", v)} />
              <Label className="text-sm">Set Prefix in Mikrotik</Label>
            </div>
          </div>
          <div>
            <Label>POP Type *</Label>
            <Select value={form.pop_type} onValueChange={(v) => upd("pop_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid (Daily Billing)</SelectItem>
                <SelectItem value="postpaid">Postpaid (Monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Min Rechargeable Amount *</Label>
            <Input type="number" value={form.min_recharge} onChange={(e) => upd("min_recharge", Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <Label>Address *</Label>
            <Textarea value={form.address} onChange={(e) => upd("address", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> POP Logo</Label>
            <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Business & Login */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> ব্যবসা ও লগইন তথ্য
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>POP / Business Name *</Label>
            <Input value={form.company_name} onChange={(e) => upd("company_name", e.target.value)} />
          </div>
          <div>
            <Label>Tariff *</Label>
            <Select value={form.tariff_id} onValueChange={(v) => upd("tariff_id", v)}>
              <SelectTrigger><SelectValue placeholder="ট্যারিফ" /></SelectTrigger>
              <SelectContent>{tariffs?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch / POP Location</Label>
            <Select value={form.branch_id} onValueChange={(v) => upd("branch_id", v)}>
              <SelectTrigger><SelectValue placeholder="ব্রাঞ্চ" /></SelectTrigger>
              <SelectContent>{branches?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.disable_clients} onCheckedChange={(v) => upd("disable_clients", v)} />
              <Label className="text-sm">Auto-disable clients on low balance</Label>
            </div>
          </div>
          <div>
            <Label>Minimum Balance</Label>
            <Input type="number" value={form.min_balance} onChange={(e) => upd("min_balance", Number(e.target.value))} />
          </div>
          <div />
          <div>
            <Label>Username *</Label>
            <Input value={form.username} onChange={(e) => upd("username", e.target.value)} />
          </div>
          <div>
            <Label>Password *</Label>
            <Input type="password" value={form.password} onChange={(e) => upd("password", e.target.value)} />
          </div>
          <div>
            <Label>Confirm Password *</Label>
            <Input type="password" value={form.confirm_password} onChange={(e) => upd("confirm_password", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> মেনু পারমিশন
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionTreeSelector value={permissions} onChange={setPermissions} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/dashboard/branches/managers")}>বাতিল</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "সংরক্ষণ হচ্ছে..." : "POP তৈরি করুন"}
        </Button>
      </div>
    </div>
  );
}
