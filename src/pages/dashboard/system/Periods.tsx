import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, CalendarDays, Calendar, Clock } from "lucide-react";

interface PeriodsConfig {
  billing_mode: string;
  cycle_type: string;
  billing_day: number;
  grace_period_days: number;
  auto_generate: boolean;
}

const defaults: PeriodsConfig = { billing_mode: "month_to_month", cycle_type: "monthly", billing_day: 1, grace_period_days: 5, auto_generate: true };

const MODE_HELP: Record<string, string> = {
  month_to_month: "সব ক্লায়েন্ট প্রতি মাসের নির্দিষ্ট তারিখে একসাথে বিল পাবে।",
  date_to_date: "প্রতি ক্লায়েন্ট নিজের চালু তারিখ অনুযায়ী বিল পাবে; expiry এর ১ দিন আগে bill তৈরি হবে।",
  hybrid: "দুই policy-ই enabled — প্রতিটি ক্লায়েন্টে আলাদা করে Monthly বা Date-to-Date বেছে নিতে হবে।",
};

export default function Periods() {
  const { value, isLoading, save, isSaving } = useSystemSetting<PeriodsConfig>("billing_periods", defaults);
  const [form, setForm] = useState<PeriodsConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <CalendarDays className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">পিরিয়ড সেটআপ</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; পিরিয়ড সেটআপ</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> বিলিং পিরিয়ড কনফিগারেশন
        </div>
        <div className="p-5 space-y-5 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1 block">বিলিং মোড</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.billing_mode} onValueChange={v => setForm(p => ({ ...p, billing_mode: v }))}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month_to_month">Monthly (মাস টু মাস)</SelectItem>
                    <SelectItem value="date_to_date">Date-to-Date (ডেট টু ডেট)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (দুটোই)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {MODE_HELP[form.billing_mode] || ""}
              </p>
            </div>
            <div>
              <Label className="text-xs mb-1 block">সাইকেল টাইপ</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.cycle_type} onValueChange={v => setForm(p => ({ ...p, cycle_type: v }))}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">মাসিক</SelectItem>
                    <SelectItem value="quarterly">ত্রৈমাসিক</SelectItem>
                    <SelectItem value="half_yearly">অর্ধ-বার্ষিক</SelectItem>
                    <SelectItem value="yearly">বার্ষিক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.billing_mode === "month_to_month" && (
              <div>
                <Label className="text-xs mb-1 block">বিলিং দিন (মাসের)</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="number" min={1} max={28} value={form.billing_day} onChange={e => setForm(p => ({ ...p, billing_day: parseInt(e.target.value) || 1 }))} className="pl-9" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs mb-1 block">গ্রেস পিরিয়ড (দিন)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="number" min={0} max={30} value={form.grace_period_days} onChange={e => setForm(p => ({ ...p, grace_period_days: parseInt(e.target.value) || 0 }))} className="pl-9" />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
