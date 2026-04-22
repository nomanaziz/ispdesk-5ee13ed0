import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { Calendar, Save } from "lucide-react";

interface PeriodCfg {
  cycle: "monthly" | "weekly" | "daily" | "custom";
  billingDay: number;
  graceDays: number;
  prorate: boolean;
  cycleDays: number;
}
const DEFAULT: PeriodCfg = { cycle: "monthly", billingDay: 1, graceDays: 3, prorate: true, cycleDays: 30 };

export default function PopPeriodSetup() {
  const { value, save, isSaving } = usePopSystemSetting<PeriodCfg>("period_setup", DEFAULT);
  const [form, setForm] = useState<PeriodCfg>(value);
  useEffect(() => setForm({ ...DEFAULT, ...value }), [value]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">পিরিয়ড সেটআপ</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Billing Period Configuration</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Billing Cycle</Label>
            <Select value={form.cycle} onValueChange={(v: any) => setForm({ ...form, cycle: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing Day of Month</Label>
            <Input type="number" min={1} max={31} value={form.billingDay} onChange={(e) => setForm({ ...form, billingDay: +e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Grace Days</Label>
            <Input type="number" min={0} value={form.graceDays} onChange={(e) => setForm({ ...form, graceDays: +e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cycle Days (custom)</Label>
            <Input type="number" min={1} value={form.cycleDays} onChange={(e) => setForm({ ...form, cycleDays: +e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={() => save(form)} disabled={isSaving}><Save className="h-4 w-4 mr-2" />সংরক্ষণ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
