import { useEffect, useState } from "react";
import { Bell, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { SMS_PROVIDERS, EMAIL_PROVIDERS, WA_PROVIDERS, TELEGRAM_PROVIDERS, type NotifChannel } from "@/lib/notifications";

interface Provider {
  id?: string;
  tenant_id: string;
  channel: NotifChannel;
  provider: string;
  sender_id: string;
  config: Record<string, any>;
  enabled: boolean;
}

const empty = (tenant_id: string, channel: NotifChannel): Provider => ({
  tenant_id, channel, provider: "", sender_id: "", config: {}, enabled: false,
});

const providerListFor = (c: NotifChannel) =>
  c === "sms" ? SMS_PROVIDERS : c === "email" ? EMAIL_PROVIDERS : c === "telegram" ? TELEGRAM_PROVIDERS : WA_PROVIDERS;

function ProviderForm({ channel }: { channel: NotifChannel }) {
  const { tenantId } = useTenant();
  const [form, setForm] = useState<Provider>(empty(tenantId || "", channel));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notification_providers")
        .select("*").eq("tenant_id", tenantId).eq("channel", channel).maybeSingle();
      if (data) setForm(data as any);
      else setForm(empty(tenantId, channel));
      setLoading(false);
    })();
  }, [tenantId, channel]);

  const setCfg = (k: string, v: any) => setForm(p => ({ ...p, config: { ...p.config, [k]: v } }));

  const save = async () => {
    if (!tenantId) return;
    setSaving(true);
    const payload = { ...form, tenant_id: tenantId };
    const { error } = form.id
      ? await supabase.from("notification_providers").update(payload).eq("id", form.id)
      : await supabase.from("notification_providers").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("সংরক্ষিত");
  };

  if (loading) return <div className="p-6 text-muted-foreground text-sm">লোড হচ্ছে...</div>;

  const cfg = form.config || {};
  const list = providerListFor(channel);

  return (
    <div className="space-y-4 p-5 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">প্রোভাইডার</Label>
          <Select value={form.provider} onValueChange={(v) => setForm(p => ({ ...p, provider: v, config: {} }))}>
            <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
            <SelectContent>{list.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{channel === "email" ? "From Name" : "Sender ID"}</Label>
          <Input value={form.sender_id || ""} onChange={e => setForm(p => ({ ...p, sender_id: e.target.value }))} />
        </div>
        <div className="flex items-end gap-2">
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm(p => ({ ...p, enabled: v }))} />
          <Label>সক্রিয়</Label>
        </div>
      </div>

      {form.provider === "sslwireless" && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs">API Token</Label><Input value={cfg.api_token || ""} onChange={e => setCfg("api_token", e.target.value)} /></div>
          <div><Label className="text-xs">SID</Label><Input value={cfg.sid || ""} onChange={e => setCfg("sid", e.target.value)} /></div>
          <div className="md:col-span-2"><Label className="text-xs">API URL (optional)</Label><Input value={cfg.url || ""} onChange={e => setCfg("url", e.target.value)} placeholder="https://smsplus.sslwireless.com/api/v3/send-sms" /></div>
        </div>
      </>}

      {form.provider === "mobireach" && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs">API URL</Label><Input value={cfg.url || ""} onChange={e => setCfg("url", e.target.value)} /></div>
          <div><Label className="text-xs">Username</Label><Input value={cfg.username || ""} onChange={e => setCfg("username", e.target.value)} /></div>
          <div><Label className="text-xs">Password</Label><Input type="password" value={cfg.password || ""} onChange={e => setCfg("password", e.target.value)} /></div>
        </div>
      </>}

      {form.provider === "webhook" && <>
        <div><Label className="text-xs">Webhook URL</Label><Input value={cfg.url || ""} onChange={e => setCfg("url", e.target.value)} /></div>
      </>}

      {form.provider === "resend" && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs">API Key</Label><Input type="password" value={cfg.api_key || ""} onChange={e => setCfg("api_key", e.target.value)} placeholder="re_..." /></div>
          <div><Label className="text-xs">From Email</Label><Input value={cfg.from || ""} onChange={e => setCfg("from", e.target.value)} placeholder="noreply@yourdomain.com" /></div>
        </div>
      </>}

      {form.provider === "whatsapp_cloud" && <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs">Phone Number ID</Label><Input value={cfg.phone_number_id || ""} onChange={e => setCfg("phone_number_id", e.target.value)} /></div>
          <div><Label className="text-xs">Access Token</Label><Input type="password" value={cfg.access_token || ""} onChange={e => setCfg("access_token", e.target.value)} /></div>
        </div>
      </>}

      {form.provider === "lovable_gateway" && (
        <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded">
          কোনো ক্রেডেনশিয়াল লাগবে না — Lovable Telegram connector ব্যবহার হবে। recipient ফিল্ডে ক্লায়েন্টের Telegram <code>chat_id</code> দিন।
        </p>
      )}

      {form.provider === "telegram_bot" && (
        <div>
          <Label className="text-xs">Bot Token</Label>
          <Input type="password" value={cfg.bot_token || ""} onChange={e => setCfg("bot_token", e.target.value)} placeholder="123456:ABC-DEF..." />
          <p className="text-xs text-muted-foreground mt-1">BotFather থেকে পাওয়া token।</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> সংরক্ষণ</Button>
      </div>
    </div>
  );
}

export default function NotificationProviders() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Bell className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">নোটিফিকেশন প্রোভাইডার</h1>
          <p className="text-xs text-muted-foreground">সিস্টেম &gt; নোটিফিকেশন &gt; প্রোভাইডার</p>
        </div>
      </div>
      <Tabs defaultValue="sms">
        <TabsList>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="telegram">Telegram</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="sms"><ProviderForm channel="sms" /></TabsContent>
        <TabsContent value="email"><ProviderForm channel="email" /></TabsContent>
        <TabsContent value="telegram"><ProviderForm channel="telegram" /></TabsContent>
        <TabsContent value="whatsapp"><ProviderForm channel="whatsapp" /></TabsContent>
      </Tabs>
    </div>
  );
}
