import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { KeyRound, RefreshCw } from "lucide-react";

type Source = "mobile" | "pppoe" | "static";

export default function DefaultPasswordSettings() {
  const qc = useQueryClient();
  const [source, setSource] = useState<Source>("mobile");
  const [staticPwd, setStaticPwd] = useState("12345678");

  const { data: setting } = useQuery({
    queryKey: ["sys-setting", "portal_default_password_source"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("setting_value").eq("setting_key", "portal_default_password_source").maybeSingle();
      return data?.setting_value as string | null;
    },
  });

  useEffect(() => {
    if (typeof setting === "string") setSource(setting as Source);
  }, [setting]);

  const saveSetting = useMutation({
    mutationFn: async (val: Source) => {
      const { error } = await supabase.from("system_settings").upsert({ setting_key: "portal_default_password_source", setting_value: val as any }, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Default password rule saved");
      qc.invalidateQueries({ queryKey: ["sys-setting", "portal_default_password_source"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkReset = useMutation({
    mutationFn: async () => {
      // Fetch all clients
      const { data: clients, error } = await supabase.from("clients").select("id, client_id, contact, password");
      if (error) throw error;
      if (!clients) return 0;
      // For each, compute new password
      const updates = clients.map((c) => {
        let newPwd = c.password;
        if (source === "mobile") newPwd = c.contact || c.client_id;
        else if (source === "pppoe") newPwd = c.client_id;
        else newPwd = staticPwd || "12345678";
        return { id: c.id, password: newPwd, username: c.client_id };
      });
      // Batch in chunks
      const chunk = 200;
      for (let i = 0; i < updates.length; i += chunk) {
        const slice = updates.slice(i, i + chunk);
        await Promise.all(
          slice.map((u) => supabase.from("clients").update({ password: u.password, username: u.username }).eq("id", u.id))
        );
      }
      return updates.length;
    },
    onSuccess: (n) => toast.success(`${n} clients reset to default password`),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Default Login Credentials</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Username = Client Code (auto). Choose what password to use:
        </p>
        <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
            <RadioGroupItem value="mobile" /> <span className="text-xs">Mobile Number (default)</span>
          </Label>
          <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
            <RadioGroupItem value="pppoe" /> <span className="text-xs">PPPoE / Client Code</span>
          </Label>
          <Label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
            <RadioGroupItem value="static" /> <span className="text-xs">Custom Static</span>
          </Label>
        </RadioGroup>
        {source === "static" && (
          <Input value={staticPwd} onChange={(e) => setStaticPwd(e.target.value)} placeholder="Static password" className="h-8 text-xs" />
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => saveSetting.mutate(source)} disabled={saveSetting.isPending}>
            Save Rule
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkReset.mutate()} disabled={bulkReset.isPending}>
            <RefreshCw className="h-3 w-3 mr-1" /> {bulkReset.isPending ? "Resetting…" : "Reset All Clients"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
