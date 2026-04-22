import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSystemSetting } from "@/hooks/useSystemSetting";
import { Save, Mail, Send, Server, User, Lock, AtSign } from "lucide-react";
import { toast } from "sonner";

interface EmailConfig {
  protocol: "mail" | "smtp";
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  encryption: string;
}

const defaults: EmailConfig = {
  protocol: "smtp",
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ইমেইল সেটআপ</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; ইমেইল সেটআপ</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-[#2c5f6e] text-white px-4 py-2.5 text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" /> Email Protocol & SMTP কনফিগারেশন
        </div>
        <div className="p-5 space-y-5 bg-card">
          <div className="flex items-center gap-6 p-3 border rounded-lg bg-muted/30">
            <Label className="text-sm font-medium">প্রোটোকল:</Label>
            <RadioGroup value={form.protocol} onValueChange={(v) => set("protocol", v as any)} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="mail" id="proto-mail" />
                <Label htmlFor="proto-mail" className="font-normal text-sm cursor-pointer">Mail (PHP mail)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="smtp" id="proto-smtp" />
                <Label htmlFor="proto-smtp" className="font-normal text-sm cursor-pointer">SMTP</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs mb-1 block">SMTP হোস্ট</Label>
              <div className="relative">
                <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.smtp_host} onChange={e => set("smtp_host", e.target.value)} className="pl-9" placeholder="smtp.gmail.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">পোর্ট</Label>
              <div className="relative">
                <Server className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="number" value={form.smtp_port} onChange={e => set("smtp_port", parseInt(e.target.value) || 587)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">এনক্রিপশন</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={form.encryption} onValueChange={v => set("encryption", v)}>
                  <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ইউজারনেম</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.smtp_username} onChange={e => set("smtp_username", e.target.value)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">পাসওয়ার্ড</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={form.smtp_password} onChange={e => set("smtp_password", e.target.value)} className="pl-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">প্রেরকের ইমেইল</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.from_email} onChange={e => set("from_email", e.target.value)} className="pl-9" placeholder="noreply@company.com" />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">প্রেরকের নাম</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={form.from_name} onChange={e => set("from_name", e.target.value)} className="pl-9" placeholder="ISP Company" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => toast.info("টেস্ট ইমেইল পাঠানো হবে")} className="gap-2">
              <Send className="h-4 w-4" /> টেস্ট ইমেইল
            </Button>
            <Button onClick={() => save(form)} disabled={isSaving} className="gap-2 bg-[#2c5f6e] hover:bg-[#245069]">
              <Save className="h-4 w-4" /> {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
