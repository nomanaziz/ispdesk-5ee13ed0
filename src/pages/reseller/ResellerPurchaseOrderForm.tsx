import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { getBillingCustomerId } from "@/lib/portalIdentity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

type RequestType = "new" | "upgrade" | "downgrade";

const ResellerPackageRequest = () => {
  const { customer } = usePortalAuth();
  const resellerId = getBillingCustomerId(customer);
  const navigate = useNavigate();

  const [requestType, setRequestType] = useState<RequestType>("new");
  const [currentServiceId, setCurrentServiceId] = useState<string>("");
  const [targetServiceId, setTargetServiceId] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["bw-services-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bw_sale_services")
        .select("id, name, code, default_rate, unit")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  const target = services.find((s: any) => s.id === targetServiceId);
  const current = services.find((s: any) => s.id === currentServiceId);

  const submit = async () => {
    if (!resellerId) return toast.error("Account not loaded");
    if (!targetServiceId) return toast.error("Please choose a target package");
    if (requestType !== "new" && !currentServiceId)
      return toast.error("Please choose your current package");

    setSaving(true);
    const orderNo = `REQ-${Date.now().toString().slice(-8)}`;
    const total = Number(target?.default_rate || 0);
    const { error } = await supabase.from("bw_purchase_orders").insert({
      order_no: orderNo,
      reseller_id: resellerId,
      billing_month: new Date().toISOString().slice(0, 7),
      note,
      total,
      status: "pending",
      request_type: requestType,
      target_service_id: targetServiceId,
      current_service_id: requestType === "new" ? null : currentServiceId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Request submitted to admin");
    navigate("/reseller/purchases");
  };

  const Icon = requestType === "upgrade" ? ArrowUpCircle : requestType === "downgrade" ? ArrowDownCircle : Plus;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/reseller/purchases">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> Package Request / Upgrade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          <div>
            <Label>Request Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {(["new", "upgrade", "downgrade"] as RequestType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={requestType === t ? "default" : "outline"}
                  onClick={() => {
                    setRequestType(t);
                    if (t === "new") setCurrentServiceId("");
                  }}
                  className="capitalize"
                >
                  {t === "new" ? "New Package" : t}
                </Button>
              ))}
            </div>
          </div>

          {requestType !== "new" && (
            <div>
              <Label>Current Package</Label>
              <Select value={currentServiceId} onValueChange={setCurrentServiceId}>
                <SelectTrigger><SelectValue placeholder="Select your current package" /></SelectTrigger>
                <SelectContent>
                  {services.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""} — ৳{Number(s.default_rate || 0).toLocaleString()}/{s.unit || "Mbps"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{requestType === "new" ? "Choose Package" : "Target Package"}</Label>
            <Select value={targetServiceId} onValueChange={setTargetServiceId}>
              <SelectTrigger><SelectValue placeholder="Select target package" /></SelectTrigger>
              <SelectContent>
                {services
                  .filter((s: any) => s.id !== currentServiceId)
                  .map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""} — ৳{Number(s.default_rate || 0).toLocaleString()}/{s.unit || "Mbps"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {target && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-semibold">{target.name}</div>
              <div className="text-muted-foreground">
                Rate: ৳ {Number(target.default_rate || 0).toLocaleString()} / {target.unit || "Mbps"}
              </div>
              {requestType === "upgrade" && current && (
                <div className="text-primary">
                  Upgrading from <span className="font-medium">{current.name}</span>
                </div>
              )}
              {requestType === "downgrade" && current && (
                <div className="text-muted-foreground">
                  Downgrading from <span className="font-medium">{current.name}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Reason for request, preferred date, etc." />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Your request will be reviewed by the admin. You'll see the status update on the Purchase Orders page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerPackageRequest;
