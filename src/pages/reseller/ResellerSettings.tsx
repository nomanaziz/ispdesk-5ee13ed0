import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { callPortal } from "@/lib/portalApi";
import { Save, Zap } from "lucide-react";
import { toast } from "sonner";

const ResellerSettings = () => {
  const { customer } = usePortalAuth();
  const accountId = getBillingCustomerId(customer);
  const isBw = customer?.type === "bw_customer" || customer?.type === "reseller_sub";
  const qc = useQueryClient();

  const [form, setForm] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    mobile: "",
    phone: "",
    address: "",
    payment_mode: "admin",
    own_bkash_number: "",
  });

  const { data } = useQuery({
    queryKey: ["reseller-settings", accountId, isBw],
    enabled: !!accountId,
    queryFn: async () => {
      if (isBw) {
        const { data } = await supabase
          .from("bw_sale_customers")
          .select("customer_name, contact_person, email, mobile, phone, address, payment_mode, own_bkash_number")
          .eq("id", accountId!)
          .maybeSingle();
        return data;
      }
      const { data } = await supabase
        .from("branch_managers")
        .select("name, company_name, email, contact, address")
        .eq("id", accountId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    if (isBw) {
      setForm({
        company_name: (data as any).customer_name || "",
        contact_person: (data as any).contact_person || "",
        email: (data as any).email || "",
        mobile: (data as any).mobile || "",
        phone: (data as any).phone || "",
        address: (data as any).address || "",
        payment_mode: (data as any).payment_mode || "admin",
        own_bkash_number: (data as any).own_bkash_number || "",
      });
    } else {
      setForm({
        company_name: (data as any).company_name || (data as any).name || "",
        contact_person: (data as any).name || "",
        email: (data as any).email || "",
        mobile: (data as any).contact || "",
        phone: "",
        address: (data as any).address || "",
        payment_mode: "admin",
        own_bkash_number: "",
      });
    }
  }, [data, isBw]);

  const save = useMutation({
    mutationFn: async () => {
      if (isBw) {
        const { error } = await supabase
          .from("bw_sale_customers")
          .update({
            customer_name: form.company_name,
            contact_person: form.contact_person,
            email: form.email,
            mobile: form.mobile,
            phone: form.phone,
            address: form.address,
            payment_mode: form.payment_mode,
            own_bkash_number: form.payment_mode === "own" ? form.own_bkash_number : null,
          })
          .eq("id", accountId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("branch_managers")
          .update({
            name: form.contact_person,
            company_name: form.company_name,
            email: form.email,
            contact: form.mobile,
            address: form.address,
          })
          .eq("id", accountId!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["reseller-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            {isBw && (
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isBw && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Receiving</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={form.payment_mode}
              onValueChange={(v) => setForm({ ...form, payment_mode: v })}
              className="space-y-2"
            >
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <RadioGroupItem value="admin" id="pm-admin" className="mt-0.5" />
                <Label htmlFor="pm-admin" className="font-normal cursor-pointer flex-1">
                  <div className="font-medium">Use Admin's bKash</div>
                  <div className="text-xs text-muted-foreground">Customer payments go to the ISP admin's bKash. Default option.</div>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-md">
                <RadioGroupItem value="own" id="pm-own" className="mt-0.5" />
                <Label htmlFor="pm-own" className="font-normal cursor-pointer flex-1">
                  <div className="font-medium">Use My Own bKash</div>
                  <div className="text-xs text-muted-foreground">Receive customer payments directly to your own bKash number.</div>
                </Label>
              </div>
            </RadioGroup>
            {form.payment_mode === "own" && (
              <div>
                <Label>Your bKash Number</Label>
                <Input
                  value={form.own_bkash_number}
                  onChange={(e) => setForm({ ...form, own_bkash_number: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isBw && <AutoRechargeCard />}

      <div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default ResellerSettings;
