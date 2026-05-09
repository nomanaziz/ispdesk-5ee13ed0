import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Save, Mail, Phone, Globe, MapPin, FileText, Image as ImageIcon, Upload, X, Loader2, Link2 } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setForm(value); }, [value]);

  const set = (k: keyof CompanyInfo, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("লোগো ফাইল ২MB এর বেশি হতে পারবে না"); return; }
    if (!file.type.startsWith("image/")) { toast.error("শুধুমাত্র ছবি আপলোড করুন"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `company-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("pop-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("pop-logos").getPublicUrl(path);
      set("logo_url", publicUrl);
      toast.success("লোগো আপলোড হয়েছে — সংরক্ষণ করতে আপডেট চাপুন");
    } catch (e: any) {
      toast.error(e.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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
        <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center gap-2 text-sm font-medium">
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
            <div className="md:col-span-3">
              <Label className="text-xs mb-1 block">কোম্পানি লোগো</Label>
              <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/30">
                <div className="h-20 w-20 rounded-md border bg-background flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                      {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {uploading ? "আপলোড হচ্ছে..." : "লোগো আপলোড করুন"}
                    </Button>
                    {form.logo_url && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", "")} className="gap-1 text-destructive">
                        <X className="h-3.5 w-3.5" /> মুছে ফেলুন
                      </Button>
                    )}
                  </div>
                  <Input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="অথবা লোগো URL পেস্ট করুন" className="text-xs" />
                  <p className="text-[11px] text-muted-foreground">PNG/JPG, সর্বোচ্চ ২MB। স্বচ্ছ পটভূমি (PNG) সবচেয়ে ভালো দেখায়।</p>
                </div>
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
            <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="h-4 w-4" /> {isSaving ? "আপডেট হচ্ছে..." : "আপডেট কোম্পানি তথ্য"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
