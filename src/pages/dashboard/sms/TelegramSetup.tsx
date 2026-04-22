import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import TelegramOptIn from "@/components/sms/TelegramOptIn";

export default function TelegramSetup() {
  const qc = useQueryClient();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [active, setActive] = useState(false);
  const [testing, setTesting] = useState(false);

  const { data: cfg } = useQuery({
    queryKey: ["admin_telegram_bot"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "admin_telegram_bot")
        .maybeSingle();
      const v = ((data as any)?.setting_value as any) || {};
      setToken(v.token || "");
      setUsername(v.username || "");
      setActive(!!v.active);
      return v;
    },
  });

  const { data: linked = [] } = useQuery({
    queryKey: ["admin_linked_clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, client_id, name, contact, telegram_linked_at")
        .not("telegram_chat_id", "is", null)
        .order("telegram_linked_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("system_settings")
        .upsert(
          { setting_key: "admin_telegram_bot", setting_value: { token, username, active } as any },
          { onConflict: "setting_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Telegram bot সেটিংস সংরক্ষিত" });
      qc.invalidateQueries({ queryKey: ["admin_telegram_bot"] });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const testConnection = async () => {
    if (!token) return toast({ title: "টোকেন প্রয়োজন", variant: "destructive" });
    setTesting(true);
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const j = await r.json();
      if (j.ok) {
        toast({ title: "✅ সংযোগ সফল", description: `@${j.result.username}` });
        if (!username) setUsername(j.result.username);
      } else {
        toast({ title: "❌ সংযোগ ব্যর্থ", description: j.description, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Telegram বট সেটআপ</h1>
        <p className="text-muted-foreground">ফ্রি SMS বিকল্প — লিঙ্কড ক্লায়েন্টদের Telegram এ মেসেজ পাঠান</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />বট কনফিগারেশন</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-1">কীভাবে শুরু করবেন:</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>Telegram এ <span className="font-mono">@BotFather</span> খুলুন</li>
                <li><span className="font-mono">/newbot</span> পাঠান, নাম ও username দিন</li>
                <li>প্রাপ্ত টোকেন এখানে paste করুন</li>
                <li>"Test" চাপুন → "Active" করুন → Save</li>
              </ol>
            </div>
            <div className="grid gap-2">
              <Label>Bot Token *</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="1234567:ABC..." type="password" />
            </div>
            <div className="grid gap-2">
              <Label>Bot Username (@ ছাড়া)</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="myisp_bot" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>সক্রিয়</Label>
                <p className="text-xs text-muted-foreground">নিষ্ক্রিয় থাকলে কোনো Telegram মেসেজ যাবে না</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={testConnection} disabled={testing}>
                {testing ? "পরীক্ষা..." : "Test Connection"}
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "সংরক্ষণ..." : "Save"}
              </Button>
            </div>
            {cfg?.token && (
              <Badge variant={active ? "default" : "secondary"} className="gap-1">
                {active ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {active ? "সক্রিয়" : "নিষ্ক্রিয়"}
              </Badge>
            )}
          </CardContent>
        </Card>

        <TelegramOptIn ownerType="admin" ownerId="global" botUsername={username} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">লিঙ্কড ক্লায়েন্ট ({linked.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">কোনো ক্লায়েন্ট এখনো লিঙ্ক করেনি</p>
          ) : (
            <div className="divide-y">
              {linked.map((c: any) => (
                <div key={c.id} className="py-2 flex justify-between text-sm">
                  <span className="font-medium">{c.name} <span className="text-muted-foreground">({c.client_id})</span></span>
                  <span className="text-muted-foreground">{c.contact} · {new Date(c.telegram_linked_at).toLocaleDateString("bn-BD")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
