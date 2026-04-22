import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { callPortal } from "@/lib/portalApi";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QuickCreateClientDialog({ open, onOpenChange }: Props) {
  const { customer } = usePortalAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isPopMode = !!customer && (customer.type === "reseller" || customer.type === "reseller_sub");
  const branchId =
    customer?.type === "reseller_sub"
      ? (customer as any)?.branch_id
      : (customer as any)?.branch_id;

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("12345");
  const [zoneId, setZoneId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");
  const [monthlyBill, setMonthlyBill] = useState<string>("");
  const [branchSel, setBranchSel] = useState<string>("");
  const [adminClientCode, setAdminClientCode] = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setName(""); setMobile(""); setUsername(""); setPassword("12345");
      setZoneId(""); setPackageId(""); setMonthlyBill(""); setBranchSel(""); setAdminClientCode("");
    }
  }, [open]);

  // Branches (admin only)
  const { data: branches = [] } = useQuery({
    queryKey: ["qc-branches"],
    enabled: open && !isPopMode,
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").order("name");
      return data || [];
    },
  });

  const effectiveBranchId = isPopMode ? branchId : branchSel || null;

  const { data: zones = [] } = useQuery({
    queryKey: ["qc-zones", effectiveBranchId],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from("zones").select("id, name, branch_id").eq("status", "active");
      if (effectiveBranchId) q = q.eq("branch_id", effectiveBranchId);
      const { data } = await q.order("name");
      return data || [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["qc-packages"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("id, name, price")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  // Auto-fill monthly bill from package
  useEffect(() => {
    if (!packageId) return;
    const pkg = packages.find((p: any) => p.id === packageId);
    if (pkg?.price && !monthlyBill) setMonthlyBill(String(pkg.price));
    if (pkg?.price) setMonthlyBill(String(pkg.price));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId, packages]);

  const generateCode = () => `C${Date.now().toString().slice(-7)}`;

  const canSubmit = useMemo(() => {
    if (!name.trim() || !mobile.trim() || !username.trim() || !password) return false;
    if (!zoneId || !packageId || !monthlyBill) return false;
    if (!isPopMode && !branchSel) return false;
    return true;
  }, [name, mobile, username, password, zoneId, packageId, monthlyBill, isPopMode, branchSel]);

  const create = useMutation({
    mutationFn: async () => {
      const code = isPopMode ? generateCode() : adminClientCode || generateCode();
      const payload: any = {
        client_id: code,
        name: name.trim(),
        mobile: mobile.trim(),
        username: username.trim(),
        password,
        zone_id: zoneId,
        package_id: packageId,
        monthly_bill: Number(monthlyBill) || 0,
        billing_status: "Active",
        status: "Active",
        joining_date: new Date().toISOString().slice(0, 10),
        branch_id: effectiveBranchId || null,
      };

      if (isPopMode) {
        const res = await callPortal<{ ok: boolean; id?: string; error?: string }>("create_client", payload);
        if (!res.ok) throw new Error(res.error || "Failed");
        return res.id;
      }

      const { data, error } = await supabase.from("clients").insert(payload).select("id").single();
      if (error) throw error;
      return data?.id;
    },
    onSuccess: (id, _vars, _ctx) => {
      toast.success(t("ক্লায়েন্ট তৈরি হয়েছে", "Client created"));
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["pop-mobile-internal"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || t("ব্যর্থ", "Failed"));
    },
  });

  const goFullForm = () => {
    onOpenChange(false);
    navigate(isPopMode ? "/pop-admin/clients/add" : "/dashboard/clients/add");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("দ্রুত ক্লায়েন্ট তৈরি", "Quick Create Client")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "শুধু আবশ্যক ফিল্ডগুলো পূরণ করুন। বাকিগুলো পরে সম্পাদনা করতে পারবেন।",
              "Fill only mandatory fields — edit the rest later.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {!isPopMode && (
            <Field label={t("শাখা *", "Branch *")}>
              <Select value={branchSel} onValueChange={setBranchSel}>
                <SelectTrigger className="h-11"><SelectValue placeholder={t("শাখা নির্বাচন", "Select branch")} /></SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label={t("ক্লায়েন্টের নাম *", "Client Name *")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </Field>

          <Field label={t("মোবাইল নম্বর *", "Mobile *")}>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" className="h-11" />
          </Field>

          {!isPopMode && (
            <Field label={t("ক্লায়েন্ট কোড", "Client Code")}>
              <Input
                value={adminClientCode}
                onChange={(e) => setAdminClientCode(e.target.value)}
                placeholder={t("খালি রাখলে অটো-জেনারেট", "Auto-generate if empty")}
                className="h-11"
              />
            </Field>
          )}

          <Field label={t("PPP ID / ইউজারনেম *", "PPP ID / Username *")}>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="h-11" />
          </Field>

          <Field label={t("পাসওয়ার্ড *", "Password *")}>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
          </Field>

          <Field label={t("জোন *", "Zone *")}>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t("জোন নির্বাচন", "Select zone")} /></SelectTrigger>
              <SelectContent>
                {zones.map((z: any) => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("প্যাকেজ *", "Package *")}>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger className="h-11"><SelectValue placeholder={t("প্যাকেজ নির্বাচন", "Select package")} /></SelectTrigger>
              <SelectContent>
                {packages.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} {p.price ? `— ৳${p.price}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={t("মাসিক বিল *", "Monthly Bill *")}>
            <Input
              value={monthlyBill}
              onChange={(e) => setMonthlyBill(e.target.value)}
              inputMode="numeric"
              className="h-11"
            />
          </Field>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={goFullForm} type="button" className="w-full sm:w-auto">
            {t("পূর্ণ ফর্ম", "Full Form")}
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!canSubmit || create.isPending}
            className="w-full sm:w-auto"
          >
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("তৈরি করুন", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
