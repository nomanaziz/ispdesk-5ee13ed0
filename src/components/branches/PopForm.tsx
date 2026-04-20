import { useEffect, useMemo, useState } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { UserPlus, Building2, ShieldCheck, ImagePlus, Lock, Info } from "lucide-react";
import PermissionTreeSelector from "@/components/branches/PermissionTreeSelector";
import { buildDefaultPermissions } from "@/lib/popPermissions";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  pop?: any; // existing branch_managers row when mode === "edit"
}

const Req = () => <span className="text-destructive">*</span>;

function LockedField({ children, locked }: { children: React.ReactNode; locked: boolean }) {
  if (!locked) return <>{children}</>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <Lock className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Admin only — change করতে admin-এর সাথে যোগাযোগ করুন</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PopForm({ mode, pop }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    () => (pop?.permissions as any) || buildDefaultPermissions()
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [division_id, setDivisionId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prefixCheck, setPrefixCheck] = useState<{ checking: boolean; available: boolean | null; msg: string }>({
    checking: false,
    available: null,
    msg: "",
  });

  const [form, setForm] = useState({
    name: pop?.name || "",
    email: pop?.email || "",
    contact: pop?.contact || "",
    phone: pop?.phone || "",
    national_id: pop?.national_id || "",
    district_id: pop?.district_id || "",
    upazila_id: pop?.upazila_id || "",
    pop_code: pop?.pop_code || "",
    pop_prefix: pop?.pop_prefix || "",
    set_prefix_mikrotik: pop?.set_prefix_mikrotik ?? false,
    pop_type: (pop?.pop_type || "prepaid") as "prepaid" | "postpaid",
    min_recharge: pop?.min_recharge ?? 100,
    address: pop?.address || "",
    company_name: pop?.company_name || "",
    tariff_id: pop?.tariff_id || "",
    disable_clients: pop?.disable_clients ?? true,
    min_balance: pop?.min_balance ?? 0,
    username: pop?.username || "",
    password: "",
    confirm_password: "",
  });

  const upd = (k: string, v: any) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const { data: tariffs } = useQuery({
    queryKey: ["reseller-tariffs-select"],
    queryFn: async () => {
      const { data } = await supabase.from("reseller_tariffs").select("id, name").eq("status", "active");
      return data ?? [];
    },
  });
  const { data: divisions } = useQuery({
    queryKey: ["divisions-select"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name").eq("status", "active").order("name");
      return data ?? [];
    },
  });
  const { data: districts } = useQuery({
    queryKey: ["districts-select", division_id],
    enabled: !!division_id,
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id, name").eq("division_id", division_id).order("name");
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

  // Pre-fill division when editing existing POP
  useEffect(() => {
    if (pop?.district_id && !division_id) {
      supabase.from("districts").select("division_id").eq("id", pop.district_id).maybeSingle()
        .then(({ data }) => { if (data?.division_id) setDivisionId(data.division_id); });
    }
  }, [pop?.district_id]);

  // Live POP Prefix uniqueness check (debounced)
  useEffect(() => {
    const p = form.pop_prefix.trim();
    if (!p) { setPrefixCheck({ checking: false, available: null, msg: "" }); return; }
    setPrefixCheck({ checking: true, available: null, msg: "চেক হচ্ছে..." });
    const t = setTimeout(async () => {
      let q = supabase.from("branch_managers").select("id", { count: "exact", head: true }).eq("pop_prefix", p);
      if (mode === "edit" && pop?.id) q = q.neq("id", pop.id);
      const { count, error } = await q;
      if (error) { setPrefixCheck({ checking: false, available: null, msg: "" }); return; }
      if ((count ?? 0) > 0) setPrefixCheck({ checking: false, available: false, msg: "এই Prefix অন্য POP ব্যবহার করছে" });
      else setPrefixCheck({ checking: false, available: true, msg: "✓ ব্যবহারযোগ্য" });
    }, 400);
    return () => clearTimeout(t);
  }, [form.pop_prefix, mode, pop?.id]);

  const fundNotice = useMemo(() => {
    if (form.pop_type === "prepaid")
      return "Prepaid: Admin fund start না করা পর্যন্ত POP client create করতে পারবে না।";
    return "Postpaid: POP সরাসরি client create করতে পারবে।";
  }, [form.pop_type]);

  const validate = (): string | null => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "আবশ্যক";
    if (!form.email.trim()) e.email = "আবশ্যক";
    if (!form.contact.trim()) e.contact = "আবশ্যক";
    if (!division_id) e.division_id = "আবশ্যক";
    if (!form.district_id) e.district_id = "আবশ্যক";
    if (!form.upazila_id) e.upazila_id = "আবশ্যক";
    if (!form.address.trim()) e.address = "আবশ্যক";
    if (!form.company_name.trim()) e.company_name = "আবশ্যক";
    if (!form.pop_prefix.trim()) e.pop_prefix = "আবশ্যক";
    else if (prefixCheck.available === false) e.pop_prefix = "এই Prefix অন্যজন ব্যবহার করছে";
    if (!form.pop_type) e.pop_type = "আবশ্যক";
    if (Number(form.min_recharge) < 100) e.min_recharge = "সর্বনিম্ন 100";
    if (mode === "create") {
      if (!form.tariff_id) e.tariff_id = "আবশ্যক";
      if (!form.username.trim()) e.username = "আবশ্যক";
      if (!form.password) e.password = "আবশ্যক";
      if (form.password !== form.confirm_password) e.confirm_password = "Password মেলেনি";
    }
    setErrors(e);
    if (Object.keys(e).length) return "অনুগ্রহ করে লাল চিহ্নিত ঘরগুলো পূরণ করুন";
    return null;
  };

  const errCls = (k: string) => errors[k] ? "border-destructive ring-1 ring-destructive" : "";

  const save = useMutation({
    mutationFn: async () => {
      const err = validate();
      if (err) throw new Error(err);

      let logo_url: string | null = pop?.logo_url ?? null;
      if (logoFile) {
        const path = `pop/${Date.now()}-${logoFile.name.replace(/\s+/g, "-")}`;
        const { error: upErr } = await supabase.storage.from("pop-logos").upload(path, logoFile, { upsert: false });
        if (upErr) throw upErr;
        logo_url = supabase.storage.from("pop-logos").getPublicUrl(path).data.publicUrl;
      }

      const basePayload: any = {
        name: form.name,
        email: form.email || null,
        contact: form.contact || null,
        phone: form.phone || null,
        national_id: form.national_id || null,
        nid_number: form.national_id || null,
        district_id: form.district_id || null,
        upazila_id: form.upazila_id || null,
        
        pop_prefix: form.pop_prefix || null,
        set_prefix_mikrotik: form.set_prefix_mikrotik,
        pop_type: form.pop_type,
        min_recharge: form.min_recharge,
        address: form.address || null,
        company_name: form.company_name || null,
        disable_clients: form.disable_clients,
        min_balance: form.min_balance,
        permissions,
        logo_url,
      };

      if (mode === "create") {
        const insertPayload = {
          ...basePayload,
          tariff_id: form.tariff_id || null,
          username: form.username,
          password: form.password,
          portal_enabled: true,
          // Postpaid → fund auto-start; prepaid → wait for admin
          fund_started: form.pop_type === "postpaid",
          fund_started_at: form.pop_type === "postpaid" ? new Date().toISOString() : null,
        };
        const { error } = await supabase.from("branch_managers").insert(insertPayload);
        if (error) throw error;
      } else {
        // Edit: only admin can change locked fields
        if (isAdmin) {
          basePayload.tariff_id = form.tariff_id || null;
          basePayload.pop_code = form.pop_code || null;
          basePayload.username = form.username;
        }
        const { error } = await supabase.from("branch_managers").update(basePayload).eq("id", pop.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-managers"] });
      qc.invalidateQueries({ queryKey: ["pop-detail", pop?.id] });
      toast.success(mode === "create" ? "POP যোগ হয়েছে" : "POP আপডেট হয়েছে");
      navigate("/dashboard/branches/managers");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const lockTariff = mode === "edit" && !isAdmin;
  const lockCode = mode === "edit" && !isAdmin;
  const lockPrefix = mode === "edit" && !isAdmin;
  const lockUsername = mode === "edit" && !isAdmin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {mode === "create" ? "POP যোগ করুন" : `POP সম্পাদনা — ${pop?.company_name || pop?.name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "create"
            ? "নতুন POP / Branch Manager — ব্যক্তিগত তথ্য, ব্যবসা ও পারমিশন"
            : "তথ্য ও পারমিশন আপডেট করুন"}
        </p>
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
            <Label>Contact Person Name <Req /></Label>
            <Input className={errCls("name")} value={form.name} onChange={(e) => upd("name", e.target.value)} />
          </div>
          <div>
            <Label>Email <Req /></Label>
            <Input className={errCls("email")} type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} />
          </div>
          <div>
            <Label>Mobile <Req /></Label>
            <Input className={errCls("contact")} value={form.contact} onChange={(e) => upd("contact", e.target.value)} />
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
            <Label>Division <Req /></Label>
            <Select value={division_id} onValueChange={(v) => { setDivisionId(v); upd("district_id", ""); upd("upazila_id", ""); setErrors((er) => { const n = { ...er }; delete n.division_id; return n; }); }}>
              <SelectTrigger className={errCls("division_id")}><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
              <SelectContent>{divisions?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>District / জেলা <Req /></Label>
            <Select value={form.district_id} onValueChange={(v) => { upd("district_id", v); upd("upazila_id", ""); }} disabled={!division_id}>
              <SelectTrigger className={errCls("district_id")}><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
              <SelectContent>{districts?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Upazila / উপজেলা <Req /></Label>
            <Select value={form.upazila_id} onValueChange={(v) => upd("upazila_id", v)} disabled={!form.district_id}>
              <SelectTrigger className={errCls("upazila_id")}><SelectValue placeholder="নির্বাচন" /></SelectTrigger>
              <SelectContent>{upazilas?.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {mode === "edit" && (
            <div>
              <Label>POP Code {lockCode && <Lock className="inline h-3 w-3 ml-1" />}</Label>
              <LockedField locked={lockCode}>
                <Input
                  value={form.pop_code}
                  onChange={(e) => upd("pop_code", e.target.value)}
                  readOnly={lockCode}
                  className={lockCode ? "bg-muted cursor-not-allowed" : ""}
                />
              </LockedField>
            </div>
          )}

          <div>
            <Label>POP Prefix <Req /> {lockPrefix && <Lock className="inline h-3 w-3 ml-1" />}</Label>
            <LockedField locked={lockPrefix}>
              <Input
                value={form.pop_prefix}
                onChange={(e) => upd("pop_prefix", e.target.value.toUpperCase())}
                placeholder="e.g. AB1"
                readOnly={lockPrefix}
                className={`${lockPrefix ? "bg-muted cursor-not-allowed" : ""} ${errCls("pop_prefix")} ${prefixCheck.available === false ? "border-destructive" : ""} ${prefixCheck.available === true ? "border-green-500" : ""}`}
              />
            </LockedField>
            {form.pop_prefix && !lockPrefix && (
              <p className={`text-[11px] mt-1 ${prefixCheck.available === false ? "text-destructive" : prefixCheck.available === true ? "text-green-600" : "text-muted-foreground"}`}>
                {prefixCheck.msg}
              </p>
            )}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={form.set_prefix_mikrotik} onCheckedChange={(v) => upd("set_prefix_mikrotik", v)} />
              <Label className="text-sm">Set Prefix in Mikrotik</Label>
            </div>
          </div>

          <div>
            <Label>POP Type <Req /></Label>
            <Select value={form.pop_type} onValueChange={(v) => upd("pop_type", v)}>
              <SelectTrigger className={errCls("pop_type")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Prepaid (Daily Billing)</SelectItem>
                <SelectItem value="postpaid">Postpaid (Monthly)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5" /> {fundNotice}
            </p>
            {mode === "edit" && (
              <p className="text-[11px] text-amber-600 mt-1">⚠ একই দিনে POP type একবারই পরিবর্তন করা যাবে।</p>
            )}
          </div>

          <div>
            <Label>Min Rechargeable Amount <Req /></Label>
            <Input className={errCls("min_recharge")} type="number" min={100} value={form.min_recharge} onChange={(e) => upd("min_recharge", Number(e.target.value))} />
            <p className="text-[11px] text-muted-foreground mt-1">সর্বনিম্ন ১০০ টাকা</p>
          </div>

          <div className="md:col-span-2">
            <Label>Address <Req /></Label>
            <Textarea className={errCls("address")} value={form.address} onChange={(e) => upd("address", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="flex items-center gap-2"><ImagePlus className="h-4 w-4" /> POP Logo</Label>
            <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            {pop?.logo_url && !logoFile && (
              <img src={pop.logo_url} alt="logo" className="mt-2 h-10 w-10 rounded object-cover" />
            )}
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
            <Label>POP / Business Name <Req /></Label>
            <Input className={errCls("company_name")} value={form.company_name} onChange={(e) => upd("company_name", e.target.value)} />
          </div>
          <div>
            <Label>
              Tariff {mode === "create" && <Req />} {lockTariff && <Lock className="inline h-3 w-3 ml-1" />}
            </Label>
            <LockedField locked={lockTariff}>
              <Select
                value={form.tariff_id}
                onValueChange={(v) => upd("tariff_id", v)}
                disabled={lockTariff}
              >
                <SelectTrigger className={errCls("tariff_id")}><SelectValue placeholder="ট্যারিফ" /></SelectTrigger>
                <SelectContent>{tariffs?.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </LockedField>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-start gap-2">
              <Switch checked={form.disable_clients} onCheckedChange={(v) => upd("disable_clients", v)} />
              <div>
                <Label className="text-sm">Auto-disable clients on low balance</Label>
                <p className="text-[11px] text-muted-foreground">
                  {form.disable_clients
                    ? "Yes → POP balance ≤ minimum হলে সব client off হবে"
                    : "No → balance zero হলেও client off হবে না"}
                </p>
              </div>
            </div>
          </div>
          <div>
            <Label>Minimum Balance</Label>
            <Input type="number" value={form.min_balance} onChange={(e) => upd("min_balance", Number(e.target.value))} />
          </div>
          <div className="md:col-span-2" />

          <div>
            <Label>Username {mode === "create" && <Req />} {lockUsername && <Lock className="inline h-3 w-3 ml-1" />}</Label>
            <LockedField locked={lockUsername}>
              <Input
                value={form.username}
                onChange={(e) => upd("username", e.target.value)}
                readOnly={lockUsername}
                className={`${lockUsername ? "bg-muted cursor-not-allowed" : ""} ${errCls("username")}`}
              />
            </LockedField>
          </div>
          {mode === "create" && (
            <>
              <div>
                <Label>Password <Req /></Label>
                <Input className={errCls("password")} type="password" value={form.password} onChange={(e) => upd("password", e.target.value)} />
              </div>
              <div>
                <Label>Confirm Password <Req /></Label>
                <Input className={errCls("confirm_password")} type="password" value={form.confirm_password} onChange={(e) => upd("confirm_password", e.target.value)} />
              </div>
            </>
          )}
          {mode === "edit" && (
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground">
                Password পরিবর্তন করতে POP list থেকে "Regenerate Password" action ব্যবহার করুন।
              </p>
            </div>
          )}
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
        <Button onClick={() => save.mutate()} disabled={save.isPending || prefixCheck.checking || prefixCheck.available === false}>
          {save.isPending ? "সংরক্ষণ হচ্ছে..." : mode === "create" ? "POP তৈরি করুন" : "আপডেট করুন"}
        </Button>
      </div>
    </div>
  );
}
