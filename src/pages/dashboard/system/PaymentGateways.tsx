import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, CreditCard, Globe } from "lucide-react";

interface Gateway {
  name: string;
  type: string;
  api_key: string;
  secret_key: string;
  account: string;
  active: boolean;
  show_on_website: boolean;
  color: string;
}

const defaultGateways: Gateway[] = [
  { name: "bKash", type: "Mobile Banking", api_key: "", secret_key: "", account: "", active: false, show_on_website: false, color: "#E2136E" },
  { name: "Nagad", type: "Mobile Banking", api_key: "", secret_key: "", account: "", active: false, show_on_website: false, color: "#F6921E" },
  { name: "Rocket", type: "Mobile Banking", api_key: "", secret_key: "", account: "", active: false, show_on_website: false, color: "#8B2F8B" },
  { name: "SSLCommerz", type: "Payment Gateway", api_key: "", secret_key: "", account: "", active: false, show_on_website: false, color: "#2E7D32" },
  { name: "Bank Transfer", type: "Bank", api_key: "", secret_key: "", account: "", active: false, show_on_website: true, color: "#1E88E5" },
];

export default function PaymentGateways() {
  const { value, isLoading, save, isSaving } = useSystemSetting<Gateway[]>("payment_gateways", defaultGateways);
  const [gateways, setGateways] = useState<Gateway[]>(defaultGateways);

  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) setGateways(value);
  }, [value]);

  const update = (idx: number, k: keyof Gateway, v: any) => {
    setGateways(prev => prev.map((g, i) => i === idx ? { ...g, [k]: v } : g));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পেমেন্ট গেটওয়ে</h1>
          <p className="text-sm text-muted-foreground">পেমেন্ট মেথড কনফিগারেশন</p>
        </div>
        <Button onClick={() => save(gateways)} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>

      <div className="grid gap-4">
        {gateways.map((gw, idx) => (
          <Card key={gw.name}>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: gw.color }} />
                <CreditCard className="h-4 w-4" /> {gw.name}
                <span className="text-xs text-muted-foreground font-normal">({gw.type})</span>
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs">ওয়েবসাইট</Label>
                  <Switch checked={gw.show_on_website} onCheckedChange={v => update(idx, "show_on_website", v)} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">সক্রিয়</Label>
                  <Switch checked={gw.active} onCheckedChange={v => update(idx, "active", v)} />
                </div>
              </div>
            </CardHeader>
            {gw.active && (
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label className="text-xs">একাউন্ট / মার্চেন্ট</Label><Input value={gw.account} onChange={e => update(idx, "account", e.target.value)} placeholder="Account ID" /></div>
                  <div><Label className="text-xs">API Key</Label><Input value={gw.api_key} onChange={e => update(idx, "api_key", e.target.value)} /></div>
                  <div><Label className="text-xs">Secret Key</Label><Input type="password" value={gw.secret_key} onChange={e => update(idx, "secret_key", e.target.value)} /></div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
