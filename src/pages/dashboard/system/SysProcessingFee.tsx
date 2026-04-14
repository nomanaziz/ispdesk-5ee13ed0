import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Percent } from "lucide-react";

interface ProcessingFeeConfig {
  fee_type: string;
  amount: number;
  applicable_to: string[];
}

const defaults: ProcessingFeeConfig = { fee_type: "flat", amount: 0, applicable_to: ["billing", "new_connection"] };

const SERVICES = [
  { key: "billing", label: "মাসিক বিলিং" },
  { key: "new_connection", label: "নতুন সংযোগ" },
  { key: "package_change", label: "প্যাকেজ পরিবর্তন" },
  { key: "reconnection", label: "পুনঃসংযোগ" },
];

export default function SysProcessingFee() {
  const { value, isLoading, save, isSaving } = useSystemSetting<ProcessingFeeConfig>("processing_fee_config", defaults);
  const [form, setForm] = useState<ProcessingFeeConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const toggleService = (key: string) => {
    setForm(p => ({
      ...p,
      applicable_to: p.applicable_to.includes(key)
        ? p.applicable_to.filter(s => s !== key)
        : [...p.applicable_to, key],
    }));
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">প্রসেসিং ফি</h1>
          <p className="text-sm text-muted-foreground">সার্ভিস প্রসেসিং ফি কনফিগারেশন</p>
        </div>
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
      <Card className="max-w-xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" /> ফি কনফিগারেশন</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ফি টাইপ</Label>
              <Select value={form.fee_type} onValueChange={v => setForm(p => ({ ...p, fee_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">নির্দিষ্ট (Flat)</SelectItem>
                  <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.fee_type === "percentage" ? "শতাংশ (%)" : "পরিমাণ (৳)"}</Label>
              <Input type="number" min={0} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>প্রযোজ্য সেবাসমূহ</Label>
            {SERVICES.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <Checkbox checked={form.applicable_to.includes(s.key)} onCheckedChange={() => toggleService(s.key)} id={s.key} />
                <Label htmlFor={s.key} className="font-normal">{s.label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
