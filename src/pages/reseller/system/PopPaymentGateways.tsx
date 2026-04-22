import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { CreditCard, Save } from "lucide-react";

interface GatewayCfg {
  enabled: boolean;
  merchantId: string;
  apiKey: string;
  secretKey: string;
}
type GwMap = Record<string, GatewayCfg>;

const GATEWAYS = [
  { key: "bkash", name: "bKash" },
  { key: "nagad", name: "Nagad" },
  { key: "rocket", name: "Rocket" },
  { key: "sslcommerz", name: "SSLCommerz" },
  { key: "stripe", name: "Stripe" },
];

const DEFAULT: GwMap = Object.fromEntries(
  GATEWAYS.map((g) => [g.key, { enabled: false, merchantId: "", apiKey: "", secretKey: "" }]),
);

export default function PopPaymentGateways() {
  const { value, save, isSaving } = usePopSystemSetting<GwMap>("payment_gateways", DEFAULT);
  const [form, setForm] = useState<GwMap>(value);
  useEffect(() => setForm({ ...DEFAULT, ...value }), [value]);

  const upd = (k: string, patch: Partial<GatewayCfg>) =>
    setForm((p) => ({ ...p, [k]: { ...p[k], ...patch } }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">পেমেন্ট গেটওয়ে</h1>
      </div>

      <div className="space-y-3">
        {GATEWAYS.map((g) => {
          const cfg = form[g.key] || DEFAULT[g.key];
          return (
            <Card key={g.key}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <Switch checked={cfg.enabled} onCheckedChange={(v) => upd(g.key, { enabled: v })} />
              </CardHeader>
              {cfg.enabled && (
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Merchant ID</Label>
                    <Input value={cfg.merchantId} onChange={(e) => upd(g.key, { merchantId: e.target.value })} /></div>
                  <div className="space-y-2"><Label>API Key</Label>
                    <Input value={cfg.apiKey} onChange={(e) => upd(g.key, { apiKey: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Secret Key</Label>
                    <Input type="password" value={cfg.secretKey} onChange={(e) => upd(g.key, { secretKey: e.target.value })} /></div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => save(form)} disabled={isSaving}><Save className="h-4 w-4 mr-2" />সংরক্ষণ</Button>
      </div>
    </div>
  );
}
