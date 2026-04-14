import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Settings } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">সিস্টেম সেটআপ</h1>
          <p className="text-sm text-muted-foreground">সিস্টেমের সাধারণ কনফিগারেশন</p>
        </div>
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
      <Card className="max-w-2xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> সাধারণ সেটিংস</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>মুদ্রা</Label><Input value={form.currency} onChange={e => set("currency", e.target.value)} /></div>
            <div><Label>মুদ্রা প্রতীক</Label><Input value={form.currency_symbol} onChange={e => set("currency_symbol", e.target.value)} /></div>
            <div>
              <Label>টাইমজোন</Label>
              <Select value={form.timezone} onValueChange={v => set("timezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>তারিখ ফরম্যাট</Label>
              <Select value={form.date_format} onValueChange={v => set("date_format", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ভাষা</Label>
              <Select value={form.language} onValueChange={v => set("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>বিলিং সাইকেল</Label>
              <Select value={form.billing_cycle} onValueChange={v => set("billing_cycle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">মাসিক</SelectItem>
                  <SelectItem value="quarterly">ত্রৈমাসিক</SelectItem>
                  <SelectItem value="yearly">বার্ষিক</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
