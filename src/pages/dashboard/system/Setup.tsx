import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Settings, DollarSign, Clock, Calendar, Globe, RotateCcw, ShieldAlert, Timer, CalendarClock, Percent } from "lucide-react";

interface SystemConfig {
  currency: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  language: string;
  billing_cycle: string;
}

interface BillingEnforcement {
  enabled: boolean;
  cutoff_time: string;
  recheck_interval: string;
  grace_days: number;
  enforcement_day: "same" | "next";
}

interface VatDefault {
  percent: number;
  mode: "including" | "excluding";
}

const vatDefaults: VatDefault = { percent: 0, mode: "including" };

const defaults: SystemConfig = {
  currency: "BDT", currency_symbol: "৳", timezone: "Asia/Dhaka",
  date_format: "DD/MM/YYYY", language: "bn", billing_cycle: "monthly",
};

const enforcementDefaults: BillingEnforcement = {
  enabled: false,
  cutoff_time: "00:00",
  recheck_interval: "60",
  grace_days: 0,
  enforcement_day: "same",
};

export default function Setup() {
  const { value, isLoading, save, isSaving } = useSystemSetting<SystemConfig>("system_config", defaults);
  const { value: enforcement, isLoading: enfLoading, save: saveEnf, isSaving: enfSaving } = useSystemSetting<BillingEnforcement>("billing_enforcement", enforcementDefaults);
  const { value: vatVal, isLoading: vatLoading, save: saveVat, isSaving: vatSaving } = useSystemSetting<VatDefault>("vat_default", vatDefaults);

  const [form, setForm] = useState<SystemConfig>(defaults);
  const [enfForm, setEnfForm] = useState<BillingEnforcement>(enforcementDefaults);
  const [vatForm, setVatForm] = useState<VatDefault>(vatDefaults);

  useEffect(() => { setForm(value); }, [value]);
  useEffect(() => { setEnfForm(enforcement); }, [enforcement]);
  useEffect(() => { setVatForm(vatVal); }, [vatVal]);

  const set = (k: keyof SystemConfig, v: string) => setForm(p => ({ ...p, [k]: v }));
  const setEnf = (k: keyof BillingEnforcement, v: any) => setEnfForm(p => ({ ...p, [k]: v }));

  if (isLoading || enfLoading || vatLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">সিস্টেম সেটআপ</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; সিস্টেম সেটআপ</p>
        </div>
      </div>

      {/* General Settings */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" /> সাধারণ সেটিংস
        </div>
        <div className="p-5 space-y-5 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs mb-1 block">মুদ্রা</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.currency} onChange={e => set("currency", e.target.value)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">মুদ্রা প্রতীক</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.currency_symbol} onChange={e => set("currency_symbol", e.target.value)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">টাইমজোন</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.timezone} onValueChange={v => set("timezone", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">তারিখ ফরম্যাট</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.date_format} onValueChange={v => set("date_format", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ভাষা</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.language} onValueChange={v => set("language", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">বিলিং সাইকেল</Label>
              <div className="relative">
                <RotateCcw className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.billing_cycle} onValueChange={v => set("billing_cycle", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">মাসিক</SelectItem>
                    <SelectItem value="quarterly">ত্রৈমাসিক</SelectItem>
                    <SelectItem value="yearly">বার্ষিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
              <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </div>
      </div>

      {/* Billing Enforcement Settings */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> বিলিং এনফোর্সমেন্ট (অটো লাইন বন্ধ)
        </div>
        <div className="p-5 space-y-5 bg-card">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <div className="font-medium text-sm">অটো এনফোর্সমেন্ট সক্রিয়</div>
              <div className="text-xs text-muted-foreground">বিল না দিলে স্বয়ংক্রিয়ভাবে PPP লাইন বন্ধ হবে</div>
            </div>
            <Switch
              checked={enfForm.enabled}
              onCheckedChange={(v) => setEnf("enabled", v)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs mb-1 block">কাটঅফ সময়</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={enfForm.cutoff_time} onValueChange={v => setEnf("cutoff_time", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="00:00">রাত ১২:০০ AM (মেয়াদ শেষের দিন)</SelectItem>
                    <SelectItem value="07:00">পরের দিন সকাল ৭:০০ AM</SelectItem>
                    <SelectItem value="08:00">পরের দিন সকাল ৮:০০ AM</SelectItem>
                    <SelectItem value="12:00">পরের দিন দুপুর ১২:০০ PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">মেয়াদ শেষ হওয়ার পর কখন লাইন বন্ধ হবে</p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">রিচেক ইন্টারভাল</Label>
              <div className="relative">
                <Timer className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={enfForm.recheck_interval} onValueChange={v => setEnf("recheck_interval", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">৩০ মিনিট</SelectItem>
                    <SelectItem value="60">১ ঘণ্টা</SelectItem>
                    <SelectItem value="120">২ ঘণ্টা</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">কত সময় পর পর পুনরায় চেক করবে</p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">গ্রেস পিরিয়ড (দিন)</Label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={String(enfForm.grace_days)} onValueChange={v => setEnf("grace_days", parseInt(v))}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">০ দিন (মেয়াদ শেষেই বন্ধ)</SelectItem>
                    <SelectItem value="1">১ দিন</SelectItem>
                    <SelectItem value="2">২ দিন</SelectItem>
                    <SelectItem value="3">৩ দিন</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">মেয়াদ শেষের পর অতিরিক্ত কত দিন অপেক্ষা করবে</p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">এনফোর্সমেন্ট দিন</Label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={enfForm.enforcement_day || "same"} onValueChange={v => setEnf("enforcement_day", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same">Same Day (billing_date তেই বন্ধ)</SelectItem>
                    <SelectItem value="next">Next Day (পরের দিন বন্ধ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">billing_date-এর দিনেই বন্ধ হবে নাকি পরের দিন</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-muted-foreground">
            <strong className="text-amber-600">⚠️ VIP ক্লায়েন্ট:</strong> VIP হিসেবে চিহ্নিত ক্লায়েন্টদের লাইন কখনও স্বয়ংক্রিয়ভাবে বন্ধ হবে না।
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => saveEnf(enfForm)} disabled={enfSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
              <Save className="h-4 w-4" /> {enfSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </div>
      </div>

      {/* VAT Defaults */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Percent className="h-4 w-4" /> VAT ডিফল্ট সেটিংস
        </div>
        <div className="p-5 space-y-5 bg-card">
          <p className="text-xs text-muted-foreground">নতুন প্যাকেজ যোগ করার সময় এই VAT মান auto-fill হবে। প্রতিটি প্যাকেজে আলাদাভাবে পরিবর্তন করা যাবে।</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">ডিফল্ট VAT (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number" min="0" step="0.01"
                  value={vatForm.percent}
                  onChange={e => setVatForm(p => ({ ...p, percent: parseFloat(e.target.value) || 0 }))}
                  className="pl-9"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">যেমন: 5, 10, 15। শূন্য মানে VAT নেই।</p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ডিফল্ট মূল্য মোড</Label>
              <Select value={vatForm.mode} onValueChange={(v) => setVatForm(p => ({ ...p, mode: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="including">Including VAT (মূল্যে অন্তর্ভুক্ত)</SelectItem>
                  <SelectItem value="excluding">Excluding VAT (আলাদা যোগ হবে)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">"Including" মানে দেখানো মূল্যেই VAT ধরা।</p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => saveVat(vatForm)} disabled={vatSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
              <Save className="h-4 w-4" /> {vatSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
