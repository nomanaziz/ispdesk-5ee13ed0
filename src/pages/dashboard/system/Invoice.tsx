import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, FileText } from "lucide-react";

interface InvoiceConfig {
  prefix: string;
  next_number: number;
  padding: number;
  footer_text: string;
  terms: string;
}

const defaults: InvoiceConfig = { prefix: "INV", next_number: 1, padding: 4, footer_text: "", terms: "" };

export default function Invoice() {
  const { value, isLoading, save, isSaving } = useSystemSetting<InvoiceConfig>("invoice_config", defaults);
  const [form, setForm] = useState<InvoiceConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const preview = `${form.prefix}-${String(form.next_number).padStart(form.padding, "0")}`;

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ইনভয়েস সেটআপ</h1>
          <p className="text-sm text-muted-foreground">ইনভয়েস নম্বর ও টেমপ্লেট কনফিগারেশন</p>
        </div>
        <Button onClick={() => save(form)} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
      <Card className="max-w-2xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> ইনভয়েস নম্বর</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>প্রিফিক্স</Label><Input value={form.prefix} onChange={e => setForm(p => ({ ...p, prefix: e.target.value }))} /></div>
            <div><Label>পরবর্তী নম্বর</Label><Input type="number" min={1} value={form.next_number} onChange={e => setForm(p => ({ ...p, next_number: parseInt(e.target.value) || 1 }))} /></div>
            <div><Label>ডিজিট</Label><Input type="number" min={1} max={10} value={form.padding} onChange={e => setForm(p => ({ ...p, padding: parseInt(e.target.value) || 4 }))} /></div>
          </div>
          <div className="bg-muted rounded-md p-3">
            <Label className="text-xs text-muted-foreground">প্রিভিউ</Label>
            <p className="text-lg font-mono font-bold text-foreground">{preview}</p>
          </div>
          <div><Label>ফুটার টেক্সট</Label><Textarea value={form.footer_text} onChange={e => setForm(p => ({ ...p, footer_text: e.target.value }))} rows={2} placeholder="ইনভয়েসের নিচে প্রদর্শিত হবে" /></div>
          <div><Label>শর্তাবলী</Label><Textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} rows={3} placeholder="পেমেন্ট শর্তাবলী..." /></div>
        </CardContent>
      </Card>
    </div>
  );
}
