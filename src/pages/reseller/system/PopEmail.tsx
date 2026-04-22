import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePopSystemSetting } from "@/hooks/usePopSystemSetting";
import { useState, useEffect } from "react";
import { Mail, Save } from "lucide-react";

interface EmailCfg {
  protocol: "mail" | "smtp";
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  encryption: "none" | "tls" | "ssl";
  enabled: boolean;
}
const DEFAULT: EmailCfg = {
  protocol: "smtp",
  fromEmail: "",
  fromName: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  encryption: "tls",
  enabled: true,
};

export default function PopEmail() {
  const { value, save, isSaving } = usePopSystemSetting<EmailCfg>("email_setup", DEFAULT);
  const [form, setForm] = useState<EmailCfg>(value);
  useEffect(() => setForm({ ...DEFAULT, ...value }), [value]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">ইমেইল সেটআপ</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Email Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            <Label>Enable Email Sending</Label>
          </div>

          <div className="space-y-2">
            <Label>Protocol</Label>
            <RadioGroup value={form.protocol} onValueChange={(v: any) => setForm({ ...form, protocol: v })} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="mail" id="pm" /><Label htmlFor="pm">Mail (PHP mail)</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="smtp" id="ps" /><Label htmlFor="ps">SMTP</Label></div>
            </RadioGroup>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>From Email</Label>
              <Input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} /></div>
            <div className="space-y-2"><Label>From Name</Label>
              <Input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} /></div>
          </div>

          {form.protocol === "smtp" && (
            <div className="grid md:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2"><Label>SMTP Host</Label>
                <Input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} /></div>
              <div className="space-y-2"><Label>SMTP Port</Label>
                <Input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: +e.target.value })} /></div>
              <div className="space-y-2"><Label>SMTP Username</Label>
                <Input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} /></div>
              <div className="space-y-2"><Label>SMTP Password</Label>
                <Input type="password" value={form.smtpPass} onChange={(e) => setForm({ ...form, smtpPass: e.target.value })} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Encryption</Label>
                <RadioGroup value={form.encryption} onValueChange={(v: any) => setForm({ ...form, encryption: v })} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="none" id="en" /><Label htmlFor="en">None</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="tls" id="et" /><Label htmlFor="et">TLS</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="ssl" id="es" /><Label htmlFor="es">SSL</Label></div>
                </RadioGroup>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => save(form)} disabled={isSaving}><Save className="h-4 w-4 mr-2" />সংরক্ষণ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
