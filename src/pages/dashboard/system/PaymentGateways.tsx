import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, CreditCard, Globe, Key, User, Tag, Building2, Smartphone, Hash, MapPin, Phone } from "lucide-react";

type Category = "mobile_personal" | "mobile_merchant" | "bank" | "gateway";

interface Gateway {
  name: string;
  category: Category;
  type: string;
  active: boolean;
  show_on_website: boolean;
  color: string;
  fields: Record<string, string>;
}

const defaultGateways: Gateway[] = [
  { name: "bKash Personal", category: "mobile_personal", type: "Mobile Banking (Personal)", active: false, show_on_website: true, color: "#E2136E",
    fields: { number: "", holder_name: "", instructions: "Send Money করুন এবং Transaction ID দিন" } },
  { name: "bKash Merchant", category: "mobile_merchant", type: "Mobile Banking (Merchant)", active: false, show_on_website: false, color: "#E2136E",
    fields: { merchant_number: "", app_key: "", app_secret: "", username: "", password: "", sandbox: "true" } },
  { name: "Nagad Personal", category: "mobile_personal", type: "Mobile Banking (Personal)", active: false, show_on_website: true, color: "#F6921E",
    fields: { number: "", holder_name: "", instructions: "Send Money করুন এবং Transaction ID দিন" } },
  { name: "Nagad Merchant", category: "mobile_merchant", type: "Mobile Banking (Merchant)", active: false, show_on_website: false, color: "#F6921E",
    fields: { merchant_id: "", merchant_number: "", public_key: "", private_key: "", sandbox: "true" } },
  { name: "Rocket Personal", category: "mobile_personal", type: "Mobile Banking (Personal)", active: false, show_on_website: true, color: "#8B2F8B",
    fields: { number: "", holder_name: "", instructions: "Send Money করুন এবং Transaction ID দিন" } },
  { name: "Bank Transfer", category: "bank", type: "Bank", active: false, show_on_website: true, color: "#1E88E5",
    fields: { bank_name: "", account_name: "", account_number: "", branch: "", routing_number: "", address: "" } },
  { name: "SSLCommerz", category: "gateway", type: "Payment Gateway", active: false, show_on_website: false, color: "#2E7D32",
    fields: { store_id: "", store_password: "", sandbox: "true" } },
  { name: "RechargeServer", category: "gateway", type: "Payment Gateway", active: false, show_on_website: true, color: "#6366F1",
    fields: { api_key: "", secret_key: "", brand_key: "", account: "" } },
];

interface FieldDef {
  key: string;
  label: string;
  icon: any;
  type?: "text" | "password" | "textarea";
  placeholder?: string;
}

const fieldDefs: Record<Category, FieldDef[] | ((gw: Gateway) => FieldDef[])> = {
  mobile_personal: [
    { key: "number", label: "মোবাইল নম্বর *", icon: Phone, placeholder: "01700-000000" },
    { key: "holder_name", label: "একাউন্ট হোল্ডারের নাম", icon: User, placeholder: "Account Holder Name" },
    { key: "instructions", label: "নির্দেশনা (গ্রাহকের জন্য)", icon: Tag, type: "textarea", placeholder: "Send Money করুন..." },
  ],
  bank: [
    { key: "bank_name", label: "ব্যাংকের নাম *", icon: Building2, placeholder: "ডাচ-বাংলা ব্যাংক" },
    { key: "account_name", label: "একাউন্ট নাম *", icon: User, placeholder: "Account Holder / Company" },
    { key: "account_number", label: "একাউন্ট নম্বর *", icon: Hash, placeholder: "1234567890" },
    { key: "branch", label: "শাখা *", icon: Building2, placeholder: "Branch Name" },
    { key: "routing_number", label: "রাউটিং নম্বর", icon: Hash, placeholder: "090260435" },
    { key: "address", label: "শাখা ঠিকানা", icon: MapPin, type: "textarea", placeholder: "Branch Address" },
  ],
  mobile_merchant: (gw) => {
    if (gw.name === "Nagad Merchant") return [
      { key: "merchant_id", label: "Merchant ID *", icon: Hash },
      { key: "merchant_number", label: "Merchant Number *", icon: Phone },
      { key: "public_key", label: "Public Key", icon: Key, type: "textarea" },
      { key: "private_key", label: "Private Key", icon: Key, type: "password" },
    ];
    return [
      { key: "merchant_number", label: "Merchant Number *", icon: Phone },
      { key: "app_key", label: "App Key *", icon: Key },
      { key: "app_secret", label: "App Secret *", icon: Key, type: "password" },
      { key: "username", label: "Username", icon: User },
      { key: "password", label: "Password", icon: Key, type: "password" },
    ];
  },
  gateway: (gw) => {
    if (gw.name === "SSLCommerz") return [
      { key: "store_id", label: "Store ID *", icon: Tag },
      { key: "store_password", label: "Store Password *", icon: Key, type: "password" },
    ];
    return [
      { key: "api_key", label: "API Key *", icon: Key },
      { key: "secret_key", label: "Secret Key *", icon: Key, type: "password" },
      { key: "brand_key", label: "Brand Key", icon: Tag },
      { key: "account", label: "Account / Merchant", icon: User },
    ];
  },
};

const categoryIcon: Record<Category, any> = {
  mobile_personal: Smartphone,
  mobile_merchant: Smartphone,
  bank: Building2,
  gateway: CreditCard,
};

export default function PaymentGateways() {
  const { value, isLoading, save, isSaving } = useSystemSetting<Gateway[]>("payment_gateways", defaultGateways);
  const [gateways, setGateways] = useState<Gateway[]>(defaultGateways);

  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      // Merge defaults to ensure new gateways are included; preserve saved values
      const merged = defaultGateways.map(def => {
        const existing = (value as Gateway[]).find(g => g.name === def.name);
        if (!existing) return def;
        return {
          ...def,
          active: existing.active ?? def.active,
          show_on_website: existing.show_on_website ?? def.show_on_website,
          fields: { ...def.fields, ...(existing.fields || {}) },
        };
      });
      setGateways(merged);
    }
  }, [value]);

  const updateToggle = (idx: number, k: "active" | "show_on_website", v: boolean) =>
    setGateways(prev => prev.map((g, i) => i === idx ? { ...g, [k]: v } : g));

  const updateField = (idx: number, fieldKey: string, v: string) =>
    setGateways(prev => prev.map((g, i) => i === idx ? { ...g, fields: { ...g.fields, [fieldKey]: v } } : g));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const renderFields = (gw: Gateway, idx: number) => {
    const defs = fieldDefs[gw.category];
    const list = typeof defs === "function" ? defs(gw) : defs;
    const isBank = gw.category === "bank";
    return (
      <div className={`grid grid-cols-1 gap-3 ${isBank ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {list.map(fd => {
          const Icon = fd.icon;
          const val = gw.fields[fd.key] ?? "";
          if (fd.type === "textarea") {
            return (
              <div key={fd.key} className={isBank ? "md:col-span-3" : "md:col-span-2"}>
                <Label className="text-xs mb-1 block">{fd.label}</Label>
                <Textarea rows={2} value={val} placeholder={fd.placeholder} onChange={e => updateField(idx, fd.key, e.target.value)} />
              </div>
            );
          }
          return (
            <div key={fd.key}>
              <Label className="text-xs mb-1 block">{fd.label}</Label>
              <div className="relative">
                <Icon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={fd.type === "password" ? "password" : "text"}
                  value={val}
                  placeholder={fd.placeholder}
                  className="pl-9"
                  onChange={e => updateField(idx, fd.key, e.target.value)}
                />
              </div>
            </div>
          );
        })}
        {(gw.category === "gateway" || gw.category === "mobile_merchant") && "sandbox" in gw.fields && (
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch
              checked={gw.fields.sandbox === "true"}
              onCheckedChange={v => updateField(idx, "sandbox", v ? "true" : "false")}
            />
            <Label className="text-xs">Sandbox Mode (টেস্ট পরিবেশ)</Label>
          </div>
        )}
      </div>
    );
  };

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
          {gateways.map((gw, idx) => {
            const CatIcon = categoryIcon[gw.category];
            return (
              <div key={gw.name} className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${gw.color}20`, color: gw.color }}>
                      <CatIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{gw.name}</div>
                      <div className="text-xs text-muted-foreground">{gw.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-xs font-normal">ওয়েবসাইট</Label>
                      <Switch checked={gw.show_on_website} onCheckedChange={v => updateToggle(idx, "show_on_website", v)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-normal">সক্রিয়</Label>
                      <Switch checked={gw.active} onCheckedChange={v => updateToggle(idx, "active", v)} />
                    </div>
                  </div>
                </div>
                {gw.active && (
                  <div className="px-4 py-3 border-t">
                    {renderFields(gw, idx)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
