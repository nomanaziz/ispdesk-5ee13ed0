import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Building2 } from "lucide-react";

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  tin: string;
  bin: string;
}

const defaults: CompanyInfo = { name: "", address: "", phone: "", email: "", website: "", logo_url: "", tin: "", bin: "" };

export default function Company() {
  const { value, isLoading, save, isSaving } = useSystemSetting<CompanyInfo>("company_info", defaults);
  const [form, setForm] = useState<CompanyInfo>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const set = (k: keyof CompanyInfo, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">কোম্পানি সেটআপ</h1>
          <p className="text-sm text-muted-foreground">কোম্পানির মৌলিক তথ্য</p>
        </div>
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
      <Card className="max-w-2xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> কোম্পানি তথ্য</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>কোম্পানির নাম</Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ISP Company Ltd." /></div>
            <div><Label>ফোন</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="01XXXXXXXXX" /></div>
            <div><Label>ইমেইল</Label><Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="info@company.com" /></div>
            <div><Label>ওয়েবসাইট</Label><Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://company.com" /></div>
            <div><Label>TIN নম্বর</Label><Input value={form.tin} onChange={e => set("tin", e.target.value)} /></div>
            <div><Label>BIN নম্বর</Label><Input value={form.bin} onChange={e => set("bin", e.target.value)} /></div>
          </div>
          <div><Label>লোগো URL</Label><Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." /></div>
          <div><Label>ঠিকানা</Label><Textarea value={form.address} onChange={e => set("address", e.target.value)} rows={3} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
