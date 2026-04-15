import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Building2, Save, Mail, Phone, Globe, MapPin, FileText, Image, Home } from "lucide-react";

interface CompanyInfo {
  name: string;
  email: string;
  address1: string;
  address2: string;
  mobile1: string;
  mobile2: string;
  phone1: string;
  phone2: string;
  website: string;
  logo_url: string;
  tin: string;
  bin: string;
  client_code_type: string;
  show_on_login: boolean;
}

const defaults: CompanyInfo = {
  name: "", email: "", address1: "", address2: "",
  mobile1: "", mobile2: "", phone1: "", phone2: "",
  website: "", logo_url: "", tin: "", bin: "",
  client_code_type: "customizable", show_on_login: false,
};

export default function Company() {
  const { value, isLoading, save, isSaving } = useSystemSetting<CompanyInfo>("company_info", defaults);
  const [form, setForm] = useState<CompanyInfo>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const set = (k: keyof CompanyInfo, v: any) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">কোম্পানি সেটআপ</h1>
            <p className="text-xs text-muted-foreground">সিস্টেম &gt; কোম্পানি সেটআপ</p>
          </div>
        </div>
      </div>

      {/* Section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4" /> কোম্পানি তথ্য
        </div>
        <div className="p-5 space-y-5 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs mb-1 block">কোম্পানির নাম <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.name} onChange={e => set("name", e.target.value)} className="pl-9" placeholder="ISP Company Ltd." />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ইমেইল</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.email} onChange={e => set("email", e.target.value)} className="pl-9" placeholder="info@company.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ওয়েবসাইট</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.website} onChange={e => set("website", e.target.value)} className="pl-9" placeholder="https://company.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ঠিকানা ১</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.address1} onChange={e => set("address1", e.target.value)} className="pl-9" placeholder="প্রধান ঠিকানা" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ঠিকানা ২</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.address2} onChange={e => set("address2", e.target.value)} className="pl-9" placeholder="বিকল্প ঠিকানা" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">লোগো URL</Label>
              <div className="relative">
                <Image className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} className="pl-9" placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">মোবাইল ১</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.mobile1} onChange={e => set("mobile1", e.target.value)} className="pl-9" placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">মোবাইল ২</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.mobile2} onChange={e => set("mobile2", e.target.value)} className="pl-9" placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ফোন ১</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.phone1} onChange={e => set("phone1", e.target.value)} className="pl-9" placeholder="02-XXXXXXXX" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ফোন ২</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.phone2} onChange={e => set("phone2", e.target.value)} className="pl-9" placeholder="02-XXXXXXXX" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">TIN নম্বর</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.tin} onChange={e => set("tin", e.target.value)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">BIN নম্বর</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.bin} onChange={e => set("bin", e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>

          {/* Client Code */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-2 block">ক্লায়েন্ট কোড</Label>
            <RadioGroup value={form.client_code_type} onValueChange={v => set("client_code_type", v)} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="customizable" id="cc-custom" />
                <Label htmlFor="cc-custom" className="font-normal">কাস্টমাইজেবল</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="automatic" id="cc-auto" />
                <Label htmlFor="cc-auto" className="font-normal">অটোমেটিক</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Show on Login */}
          <div className="flex items-center gap-2 border-t pt-4">
            <Checkbox checked={form.show_on_login} onCheckedChange={v => set("show_on_login", v)} id="show-login" />
            <Label htmlFor="show-login" className="font-normal">লগইন পেজে দেখাতে চান?</Label>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
              <Save className="h-4 w-4" /> {isSaving ? "আপডেট হচ্ছে..." : "আপডেট কোম্পানি তথ্য"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
