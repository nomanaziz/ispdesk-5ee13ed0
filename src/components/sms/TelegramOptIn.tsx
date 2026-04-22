import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  ownerType: "admin" | "pop";
  ownerId: string;
  botUsername?: string | null;
}

export default function TelegramOptIn({ ownerType, ownerId, botUsername }: Props) {
  const [clientId, setClientId] = useState("");
  const [link, setLink] = useState("");

  const generate = async () => {
    if (!clientId) {
      toast({ title: "ক্লায়েন্ট ID দিন", variant: "destructive" });
      return;
    }
    if (!botUsername) {
      toast({ title: "প্রথমে bot username সেট করুন", variant: "destructive" });
      return;
    }
    const { data: client, error: cErr } = await supabase
      .from("clients")
      .select("id, name")
      .or(`id.eq.${clientId},client_id.eq.${clientId}`)
      .maybeSingle();
    if (cErr || !client) {
      toast({ title: "ক্লায়েন্ট পাওয়া যায়নি", variant: "destructive" });
      return;
    }
    const token = `lnk_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const { error } = await supabase.from("telegram_link_requests").insert({
      token,
      client_id: client.id,
      owner_type: ownerType,
      owner_id: ownerId,
    });
    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      return;
    }
    const url = `https://t.me/${botUsername.replace(/^@/, "")}?start=${token}`;
    setLink(url);
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast({ title: "কপি করা হয়েছে" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" /> ক্লায়েন্ট লিঙ্ক জেনারেট
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>ক্লায়েন্ট ID বা UUID</Label>
          <div className="flex gap-2">
            <Input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="0001-000123" />
            <Button onClick={generate}>লিঙ্ক বানান</Button>
          </div>
        </div>
        {link && (
          <div className="grid gap-2">
            <Label>Telegram লিঙ্ক (ক্লায়েন্টকে পাঠান)</Label>
            <div className="flex gap-2">
              <Input value={link} readOnly />
              <Button variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ক্লায়েন্ট এই লিঙ্কে ক্লিক করে /start চাপলে স্বয়ংক্রিয়ভাবে যুক্ত হয়ে যাবে।
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
