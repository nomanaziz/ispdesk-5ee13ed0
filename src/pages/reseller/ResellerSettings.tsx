import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";

const ResellerSettings = () => {
  const { customer } = usePortalAuth();
  const accountId = customer?.parent_reseller_id || customer?.sub;
  const isBw = customer?.type === "bw_customer";
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    contact: "",
    address: "",
    logo_url: "",
  });

  const { data } = useQuery({
    queryKey: ["reseller-settings", accountId, isBw],
    enabled: !!accountId,
    queryFn: async () => {
      if (isBw) {
        const { data } = await supabase
          .from("bw_sale_customers")
          .select("customer_name, email, mobile, contact_person, address")
          .eq("id", accountId!)
          .maybeSingle();
        if (!data) return null;
        return {
          name: data.customer_name,
          company_name: data.contact_person,
          email: data.email,
          contact: data.mobile,
          address: data.address,
          logo_url: "",
        };
      }
      const { data } = await supabase
        .from("branch_managers")
        .select("name, company_name, email, contact, address, logo_url")
        .eq("id", accountId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name || "",
        company_name: data.company_name || "",
        email: data.email || "",
        contact: data.contact || "",
        address: data.address || "",
        logo_url: (data as any).logo_url || "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (isBw) {
        const { error } = await supabase
          .from("bw_sale_customers")
          .update({
            customer_name: form.name,
            contact_person: form.company_name,
            email: form.email,
            mobile: form.contact,
            address: form.address,
          })
          .eq("id", accountId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("branch_managers").update(form).eq("id", accountId!);
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Company Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>{isBw ? "Customer Name" : "Reseller Name"}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>{isBw ? "Contact Person" : "Company Name"}</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          {!isBw && (
            <div className="sm:col-span-2"><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
          )}
          <div className="sm:col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} /></div>
        </div>
        <div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-1" /> {save.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResellerSettings;
