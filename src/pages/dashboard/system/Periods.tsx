import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, CalendarDays } from "lucide-react";

interface PeriodsConfig {
  cycle_type: string;
  billing_day: number;
  grace_period_days: number;
  auto_generate: boolean;
}

const defaults: PeriodsConfig = { cycle_type: "monthly", billing_day: 1, grace_period_days: 5, auto_generate: true };

export default function Periods() {
  const { value, isLoading, save, isSaving } = useSystemSetting<PeriodsConfig>("billing_periods", defaults);
  const [form, setForm] = useState<PeriodsConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">পিরিয়ড সেটআপ</h1>
          <p className="text-sm text-muted-foreground">বিলিং পিরিয়ড কনফিগারেশন</p>
        </div>
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
      <Card className="max-w-xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> বিলিং পিরিয়ড</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label>সাইকেল টাইপ</Label>
            <Select value={form.cycle_type} onValueChange={v => setForm(p => ({ ...p, cycle_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">মাসিক</SelectItem>
                <SelectItem value="quarterly">ত্রৈমাসিক</SelectItem>
                <SelectItem value="half_yearly">অর্ধ-বার্ষিক</SelectItem>
                <SelectItem value="yearly">বার্ষিক</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>বিলিং দিন (মাসের)</Label><Input type="number" min={1} max={28} value={form.billing_day} onChange={e => setForm(p => ({ ...p, billing_day: parseInt(e.target.value) || 1 }))} /></div>
            <div><Label>গ্রেস পিরিয়ড (দিন)</Label><Input type="number" min={0} max={30} value={form.grace_period_days} onChange={e => setForm(p => ({ ...p, grace_period_days: parseInt(e.target.value) || 0 }))} /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
