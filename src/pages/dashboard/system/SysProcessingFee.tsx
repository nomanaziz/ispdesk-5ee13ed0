import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Percent, DollarSign, ListChecks } from "lucide-react";

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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Percent className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">প্রসেসিং ফি</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; প্রসেসিং ফি</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Percent className="h-4 w-4" /> ফি কনফিগারেশন
        </div>
        <div className="p-5 space-y-5 bg-card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs mb-1 block">ফি টাইপ</Label>
              <div className="relative">
                <ListChecks className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.fee_type} onValueChange={v => setForm(p => ({ ...p, fee_type: v }))}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">নির্দিষ্ট (Flat)</SelectItem>
                    <SelectItem value="percentage">শতাংশ (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">{form.fee_type === "percentage" ? "শতাংশ (%)" : "পরিমাণ (৳)"}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="number" min={0} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} className="pl-9" />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium mb-3 block">প্রযোজ্য সেবাসমূহ</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SERVICES.map(s => (
                <div key={s.key} className="flex items-center gap-2 border rounded-md p-2.5">
                  <Checkbox checked={form.applicable_to.includes(s.key)} onCheckedChange={() => toggleService(s.key)} id={s.key} />
                  <Label htmlFor={s.key} className="font-normal text-xs cursor-pointer">{s.label}</Label>
                </div>
              ))}
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
