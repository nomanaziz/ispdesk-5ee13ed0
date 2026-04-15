import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Settings, DollarSign, Clock, Calendar, Globe, RotateCcw } from "lucide-react";

interface SystemConfig {
  currency: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  language: string;
  billing_cycle: string;
}

const defaults: SystemConfig = {
  currency: "BDT", currency_symbol: "৳", timezone: "Asia/Dhaka",
  date_format: "DD/MM/YYYY", language: "bn", billing_cycle: "monthly",
};

export default function Setup() {
  const { value, isLoading, save, isSaving } = useSystemSetting<SystemConfig>("system_config", defaults);
  const [form, setForm] = useState<SystemConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const set = (k: keyof SystemConfig, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

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
    </div>
  );
}
