import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Mail, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  encryption: string;
}

const defaults: EmailConfig = {
  smtp_host: "", smtp_port: 587, smtp_username: "", smtp_password: "",
  from_email: "", from_name: "", encryption: "tls",
};

export default function Email() {
  const { value, isLoading, save, isSaving } = useSystemSetting<EmailConfig>("email_config", defaults);
  const [form, setForm] = useState<EmailConfig>(defaults);

  useEffect(() => { setForm(value); }, [value]);

  const set = (k: keyof EmailConfig, v: any) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ইমেইল সেটআপ</h1>
          <p className="text-sm text-muted-foreground">SMTP কনফিগারেশন</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("টেস্ট ইমেইল পাঠানো হবে (পরে কনফিগার করা হবে)")} className="gap-2">
            <Send className="h-4 w-4" /> টেস্ট ইমেইল
          </Button>
          <Button onClick={() => save(form)} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </Button>
        </div>
      </div>
      <Card className="max-w-2xl">
        <CardHeader className="bg-primary/10 rounded-t-lg py-3">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> SMTP সেটিংস</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>SMTP হোস্ট</Label><Input value={form.smtp_host} onChange={e => set("smtp_host", e.target.value)} placeholder="smtp.gmail.com" /></div>
            <div><Label>পোর্ট</Label><Input type="number" value={form.smtp_port} onChange={e => set("smtp_port", parseInt(e.target.value) || 587)} /></div>
            <div><Label>ইউজারনেম</Label><Input value={form.smtp_username} onChange={e => set("smtp_username", e.target.value)} /></div>
            <div><Label>পাসওয়ার্ড</Label><Input type="password" value={form.smtp_password} onChange={e => set("smtp_password", e.target.value)} /></div>
            <div><Label>প্রেরকের ইমেইল</Label><Input value={form.from_email} onChange={e => set("from_email", e.target.value)} placeholder="noreply@company.com" /></div>
            <div><Label>প্রেরকের নাম</Label><Input value={form.from_name} onChange={e => set("from_name", e.target.value)} placeholder="ISP Company" /></div>
          </div>
          <div>
            <Label>এনক্রিপশন</Label>
            <Select value={form.encryption} onValueChange={v => set("encryption", v)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tls">TLS</SelectItem>
                <SelectItem value="ssl">SSL</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
