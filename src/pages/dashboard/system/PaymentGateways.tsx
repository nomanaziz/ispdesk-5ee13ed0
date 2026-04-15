import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, CreditCard, Globe, Key, User, Tag } from "lucide-react";

interface Gateway {
  name: string;
  type: string;
  api_key: string;
  secret_key: string;
  brand_key?: string;
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
  { name: "RechargeServer", type: "Payment Gateway", api_key: "", secret_key: "", brand_key: "", account: "", active: false, show_on_website: true, color: "#6366F1" },
  { name: "Bank Transfer", type: "Bank", api_key: "", secret_key: "", account: "", active: false, show_on_website: true, color: "#1E88E5" },
];

export default function PaymentGateways() {
  const { value, isLoading, save, isSaving } = useSystemSetting<Gateway[]>("payment_gateways", defaultGateways);
  const [gateways, setGateways] = useState<Gateway[]>(defaultGateways);

  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      // Merge with defaults to ensure new gateways (like RechargeServer) are included
      const merged = defaultGateways.map(def => {
        const existing = (value as Gateway[]).find(g => g.name === def.name);
        return existing ? { ...def, ...existing } : def;
      });
      setGateways(merged);
    }
  }, [value]);

  const update = (idx: number, k: keyof Gateway, v: any) => {
    setGateways(prev => prev.map((g, i) => i === idx ? { ...g, [k]: v } : g));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">পেমেন্ট গেটওয়ে</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; পেমেন্ট গেটওয়ে</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> পেমেন্ট মেথড কনফিগারেশন</span>
          <Button onClick={() => save(gateways)} disabled={isSaving} size="sm" variant="secondary" className="gap-1 h-7 text-xs">
            <Save className="h-3 w-3" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </Button>
        </div>
        <div className="p-4 bg-card space-y-3">
          {gateways.map((gw, idx) => (
            <div key={gw.name} className="border rounded-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: gw.color }} />
                  <span className="font-medium text-sm">{gw.name}</span>
                  <span className="text-xs text-muted-foreground">({gw.type})</span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs font-normal">ওয়েবসাইট</Label>
                    <Switch checked={gw.show_on_website} onCheckedChange={v => update(idx, "show_on_website", v)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-normal">সক্রিয়</Label>
                    <Switch checked={gw.active} onCheckedChange={v => update(idx, "active", v)} />
                  </div>
                </div>
              </div>
              {gw.active && (
                <div className="px-4 py-3 border-t">
                  <div className={`grid grid-cols-1 gap-3 ${gw.name === "RechargeServer" ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                    <div>
                      <Label className="text-xs mb-1 block">একাউন্ট / মার্চেন্ট</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input value={gw.account} onChange={e => update(idx, "account", e.target.value)} className="pl-9" placeholder="Account ID" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">API Key</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input value={gw.api_key} onChange={e => update(idx, "api_key", e.target.value)} className="pl-9" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Secret Key</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="password" value={gw.secret_key} onChange={e => update(idx, "secret_key", e.target.value)} className="pl-9" />
                      </div>
                    </div>
                    {gw.name === "RechargeServer" && (
                      <div>
                        <Label className="text-xs mb-1 block">Brand Key</Label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input value={gw.brand_key || ""} onChange={e => update(idx, "brand_key", e.target.value)} className="pl-9" placeholder="Brand Key" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
